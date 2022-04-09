import { useStreamContext } from "../StreamContext";

export function StatsComponent() {
  const { streams, graph } = useStreamContext();

  return (
    <ul>
      <li>Number of Streams: {streams.length}</li>
      <li>
        Number of Participants: {graph ? Object.keys(graph.nodes).length : 0}
      </li>
    </ul>
  );
}
