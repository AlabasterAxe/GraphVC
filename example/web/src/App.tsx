import React, { useCallback } from "react";
import "./App.css";
import { StatsComponent } from "./components/NumStreamsComponent";
import { StreamShower } from "./components/StreamShower";
import { StreamContext } from "./StreamContext";
import { graphVcService } from "./GraphVcService";

function App() {
  const startConnection = useCallback(() => {
    graphVcService.maybeStart();
  }, []);
  return (
    <StreamContext>
      <div className="App">
        <StatsComponent />
        <StreamShower />
        <button onClick={startConnection}>Connect!</button>
      </div>
    </StreamContext>
  );
}

export default App;
