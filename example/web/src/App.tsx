import React from "react";
import "./App.css";
import { NumStreamsComponent } from "./components/NumStreamsComponent";
import { StreamShower } from "./components/StreamShower";
import { StreamContext } from "./StreamContext";

function App() {
  return (
    <StreamContext>
      <div className="App">
        <NumStreamsComponent />
        <StreamShower />
      </div>
    </StreamContext>
  );
}

export default App;
