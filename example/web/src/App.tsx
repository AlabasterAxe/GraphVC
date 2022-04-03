import React from "react";
import "./App.css";
import { NumStreamsComponent } from "./components/NumStreamsComponent";
import { VideoComponent } from "./components/VideoComponents";
import { StreamContext } from "./StreamContext";

function App() {
  return (
    <StreamContext>
      <div className="App">
        <NumStreamsComponent />
        <div id="videos">
          <VideoComponent id="localVideo" />
          <VideoComponent id="remoteVideo" />
        </div>
      </div>
    </StreamContext>
  );
}

export default App;
