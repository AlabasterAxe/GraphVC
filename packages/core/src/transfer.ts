import { User, Graph } from "./model";

export const CreateOrJoin = "create-or-join";

export type CreateOrJoinRequest = {
  roomId: string;
  user: User;
};

export const NewGraph = "graph";

export type NewGraphRequest = {
  graph: Graph;
};
