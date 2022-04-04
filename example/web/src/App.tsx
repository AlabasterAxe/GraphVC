import React from "react";
import "./App.css";
import { StatsComponent } from "./components/NumStreamsComponent";
import { StreamShower } from "./components/StreamShower";
import { StreamContext } from "./StreamContext";
import { UsersRoom } from "./components/UsersRoom";

function App() {
  return (
    <StreamContext>
      <div className="App">
        <StatsComponent />
        <StreamShower />
        <UsersRoom />
      </div>
    </StreamContext>
  );
}

export default App;
