import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as GraphVcService from "./GraphVcService";
import { Graph } from "./model/model";

const InnerStreamContext = createContext<{
  streams: MediaStream[];
  graph: Graph | undefined;
}>({ streams: [], graph: undefined });

export const useStreamContext = () => useContext(InnerStreamContext);

export function StreamContext({ children }: { children: React.ReactNode }) {
  const [streams, setStreams] = useState<MediaStream[]>([]);
  const [graph, setGraph] = useState<Graph | undefined>();

  const setStreamsCallback = useCallback(
    (streams: MediaStream[]) => setStreams(streams),
    [setStreams]
  );

  const setGraphCallback = useCallback(
    (graph: Graph | undefined) => setGraph(graph),
    [setGraph]
  );

  // still unclear to me if this is a reasonable thing to do.
  // do I need the useCallbacks above?
  useEffect(() => {
    GraphVcService.registerOnStreamChange(setStreamsCallback);
    GraphVcService.registerOnGraphChange(setGraphCallback);
    return () => {
      GraphVcService.clearOnStreamChange();
      GraphVcService.clearOnGraphChange();
    };
  }, [setStreamsCallback, setGraphCallback]);

  return (
    <InnerStreamContext.Provider value={{ streams, graph }}>
      {children}
    </InnerStreamContext.Provider>
  );
}
