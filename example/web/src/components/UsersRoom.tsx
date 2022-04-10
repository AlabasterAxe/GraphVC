import { graphVcService } from "../GraphVcService";
import { localId } from "../IdService";
import { useStreamContext } from "../StreamContext";
import { Node } from "../model/model";
import { GraphDrawer } from "./Graph";

export function UsersRoom() {
  const { graph } = useStreamContext();

  return <GraphDrawer graph={graph} />;
}
