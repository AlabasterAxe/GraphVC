import { createContext, useContext, useState } from "react";
import * as GraphVcService from "./GraphVcService";

const InnerStreamContext = createContext<MediaStream[]>([]);

export const useStreamContext = () => useContext(InnerStreamContext);

export function StreamContext({ children }: { children: React.ReactNode }) {
  const [streams, setStreams] = useState<MediaStream[]>([]);

  GraphVcService.registerOnStreamChange((streams) => setStreams(streams));

  return (
    <InnerStreamContext.Provider value={streams}>
      {children}
    </InnerStreamContext.Provider>
  );
}
