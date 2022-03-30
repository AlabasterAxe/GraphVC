import React from "react";
import "./App.css";

function App() {
  return (
    <div className="App">
      <div id="videos">
        <video id="localVideo" autoPlay muted></video>
        <video id="remoteVideo" autoPlay></video>
      </div>
    </div>
  );
}

export default App;
