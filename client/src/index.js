import React, { Component } from "react";
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
    lazyRadius: 0
  };

  async loadModel(url) {
    try {
      const model = await tf.loadLayersModel(url.model);
      } 
    catch (err) {
    console.log(err);
    }}

  async loadMetadata(url) {
    try {
      const metadataJson = await fetch(url.metadata);
      const metadata = await metadataJson.json();
     } 
    catch (err) {
      console.log(err);
    }}

  render(){
    const  url = {
      model: 'https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/model.json',
      metadata: 'https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/metadata.json'
      };
  return (
    <div className="App">
      <p>Try it out! Draw something, hit "Save" and then "Load".</p>
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
        <div>
          <label>Lazy-Radius:</label>
          <input
            type="number"
            value={this.state.lazyRadius}
            onChange={e =>
              this.setState({ lazyRadius: parseInt(e.target.value, 10) })
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
        Redraw
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
          this.loadModel(url);
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
