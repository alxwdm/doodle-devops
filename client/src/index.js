import React from "react";
import ReactDOM from "react-dom";
import CanvasDraw from "react-canvas-draw";

//import { useIsMobileOrTablet } from "./utils/isMobileOrTablet";
// import "./styles.css";

function App() {
//  const isMobOrTab = useIsMobileOrTablet();

  return (
    <div className="App">
      <h1>React-Canvas-Draw</h1>
      <h3>A simple yet powerful canvas-drawing component for React</h3>
      <iframe
        title="GitHub link"
        src="https://ghbtns.com/github-btn.html?user=embiem&repo=react-canvas-draw&type=star&count=true"
        frameborder="0"
        scrolling="0"
        width="160px"
        height="30px"
      />
      <p>
        <span role="img" aria-label="fingers pointing down">
          👇👇👇👇
        </span>{" "}
        Use your mouse to draw{" "}
        <span role="img" aria-label="fingers pointing down">
          👇👇👇👇
        </span>
      </p>
      <CanvasDraw
        style={{
          boxShadow:
            "0 13px 27px -5px rgba(50, 50, 93, 0.25),    0 8px 16px -8px rgba(0, 0, 0, 0.3)"
        }}
      />
      <p>
        Like what you see? Play around in{" "}
        <a href="https://codesandbox.io/s/6lv410914w">this CodeSandbox</a> & see
        some more{" "}
        <a href="https://embiem.github.io/react-canvas-draw/">Advanced Demos</a>
        !
      </p>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
