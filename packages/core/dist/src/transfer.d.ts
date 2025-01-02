import { User, Graph } from "./model";
export declare const CreateOrJoin = "create-or-join";
export declare type CreateOrJoinRequest = {
    roomId: string;
    user: User;
};
export declare const NewGraph = "graph";
export declare type NewGraphRequest = {
    graph: Graph;
};
