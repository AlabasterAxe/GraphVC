import { graphVcService } from "../GraphVcService";
import { localId } from "../IdService";
import { useStreamContext } from "../StreamContext";
import { Node } from "../model/model";

export function UsersRoom() {
  const { graph } = useStreamContext();

  const users: Node[] = graph?.nodes ? Object.values(graph.nodes) : [];
  const result = users.map((participant) => (
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
