import { Graph } from "../model/model";

export function GraphDrawer({ graph }: { graph: Graph }) {
  const users = [];
  let idx = 1;
  for (const _ of Object.values(graph.nodes)) {
    users.push(<circle cx={20 * idx} cy="50" r="10" />);
    idx++;
  }
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {users}
    </svg>
  );
}
