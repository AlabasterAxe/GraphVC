import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as GraphVcService from "./GraphVcService";

const InnerStreamContext = createContext<{
  streams: MediaStream[];
  participants: { id: string }[];
}>({ streams: [], participants: [] });

export const useStreamContext = () => useContext(InnerStreamContext);

export function StreamContext({ children }: { children: React.ReactNode }) {
  const [streams, setStreams] = useState<MediaStream[]>([]);
  const [participants, setParticipants] = useState<{ id: string }[]>([]);

  const setStreamsCallback = useCallback(
    (streams: MediaStream[]) => setStreams(streams),
    [setStreams]
  );

  const setParticipantsCallback = useCallback(
    (participants: { id: string }[]) => setParticipants(participants),
    [setParticipants]
  );

  // still unclear to me if this is a reasonable thing to do.
  // do I need the useCallbacks above?
  useEffect(() => {
    GraphVcService.registerOnStreamChange(setStreamsCallback);
    GraphVcService.registerOnParticipantsChange(setParticipantsCallback);
    return () => {
      GraphVcService.clearOnStreamChange();
      GraphVcService.clearOnParticipantsChange();
    };
  }, [setStreamsCallback, setParticipantsCallback]);

  return (
    <InnerStreamContext.Provider value={{ streams, participants }}>
      {children}
    </InnerStreamContext.Provider>
  );
}
