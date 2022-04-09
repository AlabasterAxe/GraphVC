export type Node = {
  id: string;
  incoming: string[];
  outgoing: string[];
};

export type Edge = {
  id: string;
  source: string;
  sink: string;

  /** these tracks reference track ids that can be looked up in the local track map */
  tracks: string[];
};

export type Graph = {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
};
