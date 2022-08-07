import { User } from "./model";

export const CreateOrJoin = "create-or-join";

export type CreateOrJoinRequest = {
  roomId: string;
  user: User;
};
