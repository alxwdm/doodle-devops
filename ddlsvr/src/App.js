import React, { Component} from "react";
import CanvasDraw from "react-canvas-draw";
import classNames from "./index.css";
import * as tf from "@tensorflow/tfjs";
import * as axios from "axios";
// import "./styles.css";

class App extends Component {
  state = {
    color: "#000000",
    width: 400,
    height: 400,
    brushRadius: 8,
    lazyRadius: 0,
    loadimmediate: false,
    model: null,
    metadata: null,
    category_idx: 0,
    predict_idx: 3,
    predict_valid: false,
    display_drawable_canvas: false,
    display_loadable_canvas: false,
    display_category_choice: true,
    display_affirmation: false,
    display_guess_button: false,
    display_drawing_tools: false,
    display_guessing: false,
    disable_drawing: false
  };

  categories = [
    'cat',
    'dog',
    'mouse',
    '... erm?'
  ];

  img_test = null;

  min_pred_conf = 0.95;
  min_insert_conf = 0.85;

  async loadModel() {
    try {
      // Load model from express server
      const model = await tf.loadLayersModel('api/model/model.json');
      this.state.model = model;
      console.log('Loaded TF model');
      } 
    catch (err) {
    console.log(err);
    }}

  random_choice() {
    /* 
    Selects a random category
    */
    const new_idx = Math.floor(Math.random()*(this.categories.length-1));
    this.setState({category_idx: new_idx});
  }

  dummy_predict() {
    /*
    Makes a dummy prediction on empty tensor
    */
    const xs = tf.zeros([1, 28, 28, 1]);
    const result = this.state.model.predict(xs).squeeze();
    const tf_idx = result.argMax(0);
    this.setState({predict_idx: tf_idx.dataSync()});
    // output prediction to console
    console.log(result.print(true));
    console.log(tf_idx.print());
    console.log(this.categories[this.state.predict_idx]);
  }

  async canvas_to_tensor(imgloaded_callback) {
    /*
    Gets canvas data and converts it into a tensor (via an Image).
    Also rescales the image data to (28,28) and reduces the dimensions.
    */
    var img = new Image();
    img.src = this.saveableCanvas.canvasContainer.children[1].toDataURL();
    img.width = 400;
    img.height = 400;
    const model = this.state.model;
    img.onload = () => {
      var tf_img = tf.browser.fromPixels(img, 4);
      tf_img = tf.image.resizeBilinear(tf_img, [28, 28]);
      tf_img = tf_img.slice([0, 0, 3], [-1, -1, -1]);
      imgloaded_callback(model, tf_img);
    }
  }

  async model_predict() {
    /*
    Predicts on canvas data.
    The confidence of the prediction is determined by a softmax.
    -> If the confidence is below a threshold, the model's prediction is ignored.
    Afterwards, the drawing is persisted in a database for delta training.
    -> This is only done if the confidence is above an insertion threshold.
    -> If this is not the case, then the drawing is probably nonsense.
    */
    console.log('predicting...');
    this.canvas_to_tensor(
      (model, tf_img) => {
        // retrieve prediction data
        const data_img = tf_img.dataSync();
        const data_arr = Array.from(data_img);
        const cat_idx = this.state.category_idx;
        // predict on image tensor
        tf_img = tf.expandDims(tf_img, 0);
        const pred_logits = model.predict(tf_img).squeeze();
        const pred_idx = pred_logits.argMax(0).dataSync();
        const max_logits = pred_logits.max(0).dataSync();
        //debugging: log logits
        console.log(pred_logits.print())
        // check prediction confidence via customized softmax fn
        var pred_exp = null
        if (max_logits > 80) {
          /* note: logits > 80 lead to inf values (float32)
                   Re-scaling distorts the probabilites, but testing 
                   showed that it works out for this 3 category demo case. */
          pred_exp = tf.exp(tf.div(pred_logits,tf.scalar(100))); 
        } 
        if (max_logits < 80) {
          pred_exp = tf.exp(pred_logits);          
        }  
        const pred_total = tf.sum(pred_exp)
        const pred_softmax = tf.div(pred_exp, pred_total)
        const pred_max_sm = pred_softmax.max(0).dataSync();
        console.log('softmax output: ' + pred_softmax.dataSync());
        // set state according to prediciton and confidence
        if (pred_max_sm > this.min_pred_conf) {
        this.setState({predict_idx: pred_idx});
        this.setState({predict_valid: true}); 
        this.setState({display_guessing: false}); 
        console.log('predicted category: ' + pred_idx[0]);         
        }
        else {
        this.setState({predict_idx: 3});
        this.setState({predict_valid: true});
        this.setState({display_guessing: false}); 
        console.log('confidence below threshold!');            
        }
        // send data to mdlsvr to persist in database
        // (only if the confidence level is above threshold)
        if (pred_max_sm > this.min_insert_conf) {
          this.handlePredict(cat_idx, pred_idx[0], data_arr);          
        }
        return pred_idx;
      }
      );
  }

  handlePredict = async (cat_idx, pred_idx, img) => {
    await axios.post('/api/predict', {
      category_idx: cat_idx,
      predict_idx: pred_idx,
      data: img
    });
    console.log('sent doodle to mdlsvr.');
  };

/*
  draw_image() {
    var img = new Image();
    img.src = this.rescaledCanvas.canvasContainer.children[1].toDataURL();
    img.width = 28;
    img.height = 28;   
    document.getElementById("testcanvas").src = img.src
  }
*/

  render(){
  return (
    <div className="App">
      <h1>Cat, dog or mouse - can an AI recognize your drawing?</h1>

      <p>
        DoodleAI: Hi there! Can you draw a {this.categories[this.state.category_idx]} for me?
      </p>
      {this.state.display_category_choice &&
      <p> 

      <button
        onClick={async() => {
          if (this.state.model == null) {
              await this.loadModel();
            }
          this.setState({display_drawing_tools: true});
          this.setState({display_drawable_canvas: true});
          this.setState({display_affirmation: true});
          this.setState({display_category_choice: false});
        }}
      >
        Sure I can!

      </button>
      <button
        onClick={() => {
          this.random_choice();
          window.scrollTo(0,document.body.scrollHeight);
        }}
      >
        Give me something else!
      </button>
      </p>}

      {this.state.display_affirmation &&
      <p>
      You: Sure I can!
      </p>}

      {this.state.display_drawable_canvas &&
      <p>

      DoodleAI: Okay, here we go...
      </p>}

      {this.state.display_drawing_tools &&
      <div className={classNames.tools}>
        <button
          onClick={() => {
            this.saveableCanvas.clear();
            window.scrollTo(0,document.body.scrollHeight);
          }}
        >
          Clear
        </button>
        <button
          onClick={() => {
            this.saveableCanvas.undo();
          }}
        >
          Undo
        </button>
        <button
          onClick={ async () => {
          if (this.state.model == null) {
                await this.loadModel();
              }
          await localStorage.setItem(
                "savedDrawing",
                this.saveableCanvas.getSaveData()
              );
          await this.setState({loadimmediate: false})
          await this.setState({display_loadable_canvas: true})      
          await this.setState({display_guess_button: true})
          await this.setState({display_drawing_tools: false})
          await this.setState({disable_drawing: true})
          await this.saveableCanvas.loadSaveData(localStorage.getItem("savedDrawing"))
          window.scrollTo(0,document.body.scrollHeight);
          }}
        >
          Done
        </button>        
        <p>
        
        </p>
      </div>}

      {this.state.display_loadable_canvas &&
      <div>
      <p>
      You: I'm done drawing!
      </p>
      <p>
      DoodleAI: Ready? Okay, let me see what you have drawn here...
      </p>
      </div>}

      {this.state.display_drawable_canvas &&
      <CanvasDraw
        ref={canvasDraw => (this.saveableCanvas = canvasDraw)}
        brushColor={this.state.color}
        brushRadius={this.state.brushRadius}
        lazyRadius={this.state.lazyRadius}
        canvasWidth={this.state.width}
        canvasHeight={this.state.height}
        immediateLoading={this.state.loadimmediate}
        disabled={this.state.disable_drawing}
      />}

      <p>
      
      </p>

      {this.state.display_guess_button &&
      <p>
      You: 
      <button
        onClick={ async () => { 
          this.setState({loadimmediate: true})
          if (this.state.model == null) {
              await this.loadModel();
            }
          await this.setState({display_guess_button: false});
          await this.setState({display_guessing: true});
          await this.model_predict();
          window.scrollTo(0,document.body.scrollHeight);
        }}
      >
        Guess what it is!
      </button>
      </p>}

      {this.state.display_guessing &&
      <div>
      <p>
        You: Guess what it is!
      </p>
      <p>
        DoodleAI is guessing...
      </p>
      </div>}

      {this.state.predict_valid &&
      <div>
      <p>
        You: Guess what it is!
      </p>
      <p>
        DoodleAI: This is a {this.categories[this.state.predict_idx]}!
      </p>
      {window.scrollTo(0,document.body.scrollHeight)}
      <p>
      You: 
      <button
        onClick={async () => { 
          await this.saveableCanvas.clear();
          await this.setState({predict_valid: false})
          await this.setState({display_loadable_canvas: false})
          await this.setState({display_drawable_canvas: false})
          await this.setState({predict_valid: false})
          await this.setState({loadimmediate: true})
          await this.setState({display_affirmation: false});
          await this.setState({display_category_choice: true});
          await this.setState({disable_drawing: false});
          await localStorage.setItem("savedDrawing", null);
          }}
      >
        Let's play again!
      </button>
      </p>
      </div>}
      <div id="footer" style={{"color": "grey", "fontSize": 8+'px', 
      "position": "fixed", "bottom": 0, "width": "100%"}}>
      >Project inspired by <a href="https://quickdraw.withgoogle.com/" title="QuickDraw">Google Quickdraw.</a><br/>
      >Model pre-training was done using the <a href="https://github.com/googlecreativelab/quickdraw-dataset/" title="QuickDraw">Quickdraw dataset.</a><br/>  
      >Icon made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> {' '}
      from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com.</a><br/>
      </div>
    </div>
  );
  }
}

export default App;
