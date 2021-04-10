import React, { Component} from "react";
import ReactDOM from "react-dom";
import CanvasDraw from "react-canvas-draw";
import classNames from "./index.css";
import * as tf from "@tensorflow/tfjs";

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
    category_idx: 0
  };

  url = {
    model: 'https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/model.json',
    metadata: 'https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/metadata.json'
  };

  categories = [
    'Cat',
    'Dog',
    'Mouse'
  ]

  async loadModel(url) {
    try {
      const model = await tf.loadLayersModel(url.model);
      this.state.model = model;
      // console.log('Loaded TF model');
      } 
    catch (err) {
    console.log(err);
    }}

  async loadMetadata(url) {
    try {
      const metadataJson = await fetch(url.metadata);
      const metadata = await metadataJson.json();
      this.state.metadata = metadata;
      // console.log('Loaded TF metadata');
     } 
    catch (err) {
      console.log(err);
    }}

  random_choice() {
    const new_idx = Math.floor(Math.random()*this.categories.length);
    this.setState({category_idx: new_idx});
    //console.log('called random_choice. State is: ', this.state.category_idx);
  }

  render(){
  return (
    <div className="App">
      <h1>Doodle DevOps Client</h1>
      <p>
        Can you draw a {this.categories[this.state.category_idx]} for me?
      </p>
      <div className={classNames.tools}>
        <button
          onClick={() => {
            localStorage.setItem(
              "savedDrawing",
              this.saveableCanvas.getSaveData()
            );
          }}
        >
          Save
        </button>
        <button
          onClick={() => {
            this.saveableCanvas.clear();
            this.random_choice();
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
        <div>
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
        </div>
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
        The following is a disabled canvas with a hidden grid that we use to
        load & show your saved drawing.
        Load what you saved previously by calling `loadSaveData()` on 
        the component's reference or passing it to the `saveData` prop.
      </p>
      <button
        onClick={() => {
          this.loadableCanvas.loadSaveData(
            localStorage.getItem("savedDrawing")
          );
        }}
      >
        Predict
      </button>
      <CanvasDraw
        disabled
        hideGrid
        ref={canvasDraw => (this.loadableCanvas = canvasDraw)}
        saveData={localStorage.getItem("savedDrawing")}
      />
      <p>
        The saving & loading also takes different dimensions into account.
        Change the width & height, draw something and save it and then load it
        into the disabled canvas. It will load your previously saved
        masterpiece scaled to the current canvas dimensions.
      </p>
      <p>
        Let's try loading a tensorflow.js model!
      </p>
      <button
        onClick={() => {
          this.loadModel(this.url);
          this.loadMetadata(this.url);
        }}
      >
        Load tfjs model
      </button>
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
