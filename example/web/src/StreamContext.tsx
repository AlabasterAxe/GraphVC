import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as GraphVcService from "./GraphVcService";

const InnerStreamContext = createContext<MediaStream[]>([]);

export const useStreamContext = () => useContext(InnerStreamContext);

export function StreamContext({ children }: { children: React.ReactNode }) {
  const [streams, setStreams] = useState<MediaStream[]>([]);

  const setStreamsCallback = useCallback(
    (streams: MediaStream[]) => setStreams(streams),
    [setStreams]
  );

  // still unclear to me if this is a reasonable thing to do.
  useEffect(() => {
    GraphVcService.registerOnStreamChange(setStreamsCallback);
    return () => GraphVcService.clearOnStreamChange();
  }, [setStreamsCallback]);

  return (
    <InnerStreamContext.Provider value={streams}>
      {children}
    </InnerStreamContext.Provider>
  );
}
