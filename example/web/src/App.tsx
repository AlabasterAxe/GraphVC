import React from "react";
import "./App.css";
import { VideoComponent } from "./components/VideoComponents";

function App() {
  return (
    <div className="App">
      <div id="videos">
        <VideoComponent id="localVideo" />
        <VideoComponent id="remoteVideo" />
      </div>
    </div>
  );
}

export default App;
