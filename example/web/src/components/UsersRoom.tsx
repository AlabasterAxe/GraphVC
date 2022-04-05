import { graphVcService } from "../GraphVcService";
import { localId } from "../IdService";
import { useStreamContext } from "../StreamContext";

export function UsersRoom() {
  const { participants } = useStreamContext();

  const result = participants.map((participant) => (
    <li key={participant.id}>
      {participant.id}{" "}
      {participant.id !== localId() && (
        <button
          onClick={() => {
            graphVcService.connect(participant.id);
          }}
        >
          connect
        </button>
      )}
      {participant.id === localId() && <span>(you)</span>}
    </li>
  ));
  return <ul>{result}</ul>;
}
