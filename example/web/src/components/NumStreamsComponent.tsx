import { useStreamContext } from "../StreamContext";

export function NumStreamsComponent() {
  const streams = useStreamContext();

  return <div>Number of Streams: {streams.length}</div>;
}
