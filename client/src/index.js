import React, { Component} from "react";
import ReactDOM from "react-dom";
import CanvasDraw from "react-canvas-draw";
import classNames from "./index.css";
import * as tf from "@tensorflow/tfjs";
//import * as tfn from "@tensorflow/tfjs-node"

//import { useIsMobileOrTablet } from "./utils/isMobileOrTablet";
// import "./styles.css";

class App extends Component {
//  const isMobOrTab = useIsMobileOrTablet();
  state = {
    color: "#000000",
    width: 400,
    height: 400,
    brushRadius: 10,
    lazyRadius: 0,
    model: null,
    metadata: null,
    category_idx: 0,
    predict_idx: false,
    predict_valid: false
  };

  categories = [
    'Cat',
    'Dog',
    'Mouse'
  ];

  img_test = null;

  async loadModel() {
    try {
      /*
      Example Code:
      - server: https://codesandbox.io/s/upbeat-lumiere-qyeho?file=/src/index.js
      - client: https://codesandbox.io/s/brave-murdock-ck6of?file=/src/App.js
      */

      // Load model from express server
      // via api? net::ERR_NAME_NOT_RESOLVED
      //const model = await tf.loadLayersModel('http://api/model/model.json');
      //const model = await tf.loadLayersModel('http://api:4000/model/model.json');
      //const model = await tf.loadLayersModel('api/model/model.json');
      // via localhost --> works TODO fix express server connection
      const model = await tf.loadLayersModel('http://localhost:4000/model/model.json');
      this.state.model = model;
      console.log('Loaded TF model');
      } 
    catch (err) {
    console.log(err);
    }}

  random_choice() {
    const new_idx = Math.floor(Math.random()*this.categories.length);
    this.setState({category_idx: new_idx});
    //console.log('called random_choice. State is: ', this.state.category_idx);
  }

  dummy_predict() {
    // dummy prediction
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
    var img = new Image();
    img.src = this.rescaledCanvas.canvasContainer.children[1].toDataURL();
    img.width = 28;
    img.height = 28;
    const model = this.state.model;
    img.onload = () => {
      var tf_img = tf.browser.fromPixels(img, 4);
      tf_img = tf_img.slice([0, 0, 3], [-1, -1, -1]);
      const pred_idx_res = imgloaded_callback(model, tf_img);
    }
  }

  async model_predict() {
          console.log('Predicting...');
          const pred_idx_ret = this.canvas_to_tensor(
            (model, tf_img) => {
              //console.log(tf_img.print());
              console.log('i am inside callback fn');
              // predict on image tensor
              tf_img = tf.expandDims(tf_img, 0);
              const pred_logits = model.predict(tf_img).squeeze();
              const pred_idx_tf = pred_logits.argMax(0);
              // output prediction to console -- tensors
              //console.log(pred_logits.print(true));
              //console.log(pred_idx_tf.print(true));   
              // output prediction to console - array
              const pred_idx = pred_idx_tf.dataSync();
              console.log('Prediction is: ' + pred_idx[0]);
              // TODO set state inside this fn without error
              this.setState({predict_idx: pred_idx});
              this.setState({predict_valid: true});
              return pred_idx;
            }
            );
  }

/*
  model_predict(tf_img) {
    // replace this with canvas_to_tensor
    //var tf_img = tf.zeros([28, 28, 1]);
    // predict on image tensor
    tf_img = tf.expandDims(tf_img, 0);
    const pred_logits = this.state.model.predict(tf_img).squeeze();
    const pred_idx = pred_logits.argMax(0);
    // output prediction to console
    console.log(pred_logits.print(true));
    console.log(pred_idx.print());   
    this.setState({predict_idx: pred_idx.dataSync()});
    return pred_idx.dataSync();
  }
*/

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
      <h1>Doodle DevOps Client</h1>

      <p>
        Can you draw a {this.categories[this.state.category_idx]} for me?
      </p>

      <button
        onClick={() => {
          this.saveableCanvas.clear();
          this.random_choice();
        }}
      >
        Give me something else!
      </button>

      <p>

      </p>

      <div className={classNames.tools}>
        <button
          onClick={() => {
            this.saveableCanvas.clear();
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
        <p>
        
        </p>
      </div>

      <CanvasDraw
        ref={canvasDraw => (this.saveableCanvas = canvasDraw)}
        brushColor={this.state.color}
        brushRadius={this.state.brushRadius}
        lazyRadius={this.state.lazyRadius}
        canvasWidth={this.state.width}
        canvasHeight={this.state.height}
      />

      <p>
      
      </p>

      <button
        onClick={ async () => {
        if (this.state.model == null) {
              await this.loadModel();
            }
        await localStorage.setItem(
              "savedDrawing",
              this.saveableCanvas.getSaveData()
            );
        await this.loadableCanvas.loadSaveData(
            localStorage.getItem("savedDrawing")
          );
        await this.rescaledCanvas.loadSaveData(
            localStorage.getItem("savedDrawing")
          );  
        await this.model_predict();      
        }}
      >
        Predict
      </button>

      <p>

        Ready? Let me see what you have drawn here...
      </p>

      <button
        onClick={ async () => { 
        if (this.state.model == null) {
              await this.loadModel();
            }
          this.model_predict();      
        }}
      >
        Predict again!
      </button>

      <CanvasDraw
        ref={canvasDraw => (this.loadableCanvas = canvasDraw)}
        brushColor={this.state.color}
        brushRadius={this.state.brushRadius}
        lazyRadius={this.state.lazyRadius}
        canvasWidth={this.state.width}
        canvasHeight={this.state.height}
        saveData={localStorage.getItem("savedDrawing")}
        disabled={true}
        hideGrid={true}
      />

      <CanvasDraw 
        ref={canvasDraw => (this.rescaledCanvas = canvasDraw)}
        brushColor={this.state.color}
        brushRadius={1}
        lazyRadius={0}
        canvasWidth={28}
        canvasHeight={28}
        saveData={localStorage.getItem("savedDrawing")}
        disabled={true}
        //style={{"display": "none"}}
      />

      <p>
        This is a {this.categories[this.state.predict_idx]}!
      </p>




      <div id="icon" style={{"color": "grey", "fontSize": 8+'px'}}>>
      Icon made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> {' '}
      from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>
      </div>
    </div>
  );
  }
}

export default App;

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);

        /*
Example Tools to set cursor width etc.
          <label>Width:</label>
          <input
            type="number"
            value={this.state.width}
            onChange={e =>
              this.setState({ width: parseInt(e.target.value, 10) })
            }
          />
        </div>
        <div>
          <label>Height:</label>
          <input
            type="number"
            value={this.state.height}
            onChange={e =>
              this.setState({ height: parseInt(e.target.value, 10) })
            }
          />
        </div>
        <div>
          <label>Brush-Radius:</label>
          <input
            type="number"
            value={this.state.brushRadius}
            onChange={e =>
              this.setState({ brushRadius: parseInt(e.target.value, 10) })
            }
          />
        */
