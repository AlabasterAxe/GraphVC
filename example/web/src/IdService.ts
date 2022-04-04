import { v4 as uuidv4 } from "uuid";

const id = uuidv4();

export function localId(): string {
  return id;
}
