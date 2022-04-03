import { useStreamContext } from "../StreamContext";

export function StatsComponent() {
  const { streams, participants } = useStreamContext();

  return (
    <ul>
      <li>Number of Streams: {streams.length}</li>
      <li>Number of Participants: {participants.length}</li>
    </ul>
  );
}
