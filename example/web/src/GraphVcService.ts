import { Socket } from "socket.io-client";
import { localId, newId } from "./IdService";
import { Edge, Graph } from "./model/model";

declare const io: () => Socket;

const socket = io();
const ROOM = "foo";
let roomGraph: Graph | undefined;

const ICE_SERVERS = [
  {
    urls: "stun:stun.l.google.com:19302",
  },
  {
    urls: "turn:104.198.254.64:3478",
    username: "test",
    credential: "test123",
  },
];

type User = {
  id: string;
};

type GraphVcConnection = {
  pc: RTCPeerConnection;
  stream: MediaStream;
  isStarted: boolean;
  userId: string;
};

export class GraphVcService {
  isChannelReady = false;
  localStream: MediaStream | undefined;

  peers: Map<string, GraphVcConnection> = new Map();

  initializeConnection(userId: string): GraphVcConnection {
    if (this.localStream !== undefined) {
      console.log(">>>>>> creating peer connection");
      const mediaStream = new MediaStream();
      const pc = createPeerConnection(userId, (track) => {
        mediaStream.addTrack(track);
      });
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track);
      }
      const conn = { pc, stream: mediaStream, isStarted: false, userId };
      this.peers.set(userId, conn);
      _onStreamChange(this.getActiveStreams());
      return conn;
    }
    throw new Error("local stream is not defined");
  }

  getActiveStreams() {
    const result = [];

    if (this.localStream) {
      result.push(this.localStream);
    }

    this.peers.forEach((conn) => {
      if (conn.stream) {
        result.push(conn.stream);
      }
    });

    return result;
  }

  onLocalStream(stream: MediaStream) {
    console.log("Adding local stream.");
    this.localStream = stream;
    sendMessage(socket, "got user media");
    _onStreamChange(this.getActiveStreams());
  }

  hangup() {
    console.log("Hanging up.");
    this.peers.forEach((_, userId) => {
      this.stop(userId);
    });
    sendMessage(socket, "bye");
  }

  handleRemoteHangup(userId: string) {
    console.log("Session terminated.");
    this.stop(userId);
  }

  // todo: there should be a connection class that
  // encapsulates the peer connection and the stream
  stop(userId: string) {
    const conn = this.peers.get(userId);
    if (!conn) {
      // noop
      return;
    }
    conn.pc.close();
    this.peers.delete(userId);
    _onStreamChange(this.getActiveStreams());
  }

  initialize() {
    socket.emit("create-or-join", { roomId: ROOM, user: { id: localId() } });
    console.log("Attempted to create or  join room", ROOM);

    socket.on("created", (room) => {
      console.log("Created room " + room);
    });

    socket.on("full", (room) => {
      console.log("Room " + room + " is full");
    });

    socket.on("graph", ({ graph }) => {
      console.log("got new graph", graph);
      this.applyGraph(graph);
    });

    socket.on("join", ({ roomId }) => {
      this.isChannelReady = true;
    });

    socket.on("joined", ({ roomId }) => {
      console.log("joined: " + roomId);
      this.isChannelReady = true;
    });

    socket.on("log", (array) => {
      console.log(array);
    });

    // This client receives a message
    socket.on("message", ({ message, senderId }) => {
      console.log("Client received message:", message, "from", senderId);
      // TODO(matt): cleanup these handlers
      if (message.type === "offer") {
        let conn = this.peers.get(senderId);
        if (!conn) {
          conn = this.initializeConnection(senderId);
        }
        if (!conn.isStarted) {
          conn.pc.setRemoteDescription(new RTCSessionDescription(message));
          answer(conn);
          conn.isStarted = true;
        }
      } else if (message.type === "answer") {
        const conn = this.peers.get(senderId);
        if (!conn) {
          throw new Error("no connection for " + senderId);
        }
        if (!conn.isStarted) {
          conn.pc.setRemoteDescription(new RTCSessionDescription(message));
          conn.isStarted = true;
        }
      } else if (message.type === "candidate") {
        const conn = this.peers.get(senderId);
        if (!conn) {
          throw new Error("no connection for " + senderId);
        }
        var candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        });
        conn.pc.addIceCandidate(candidate);
      } else if (message === "bye") {
        this.handleRemoteHangup(senderId);
      }
    });

    console.log("Getting user media with constraints", CONSTRAINTS);
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: true,
      })
      .then((stream) => this.onLocalStream(stream))
      .catch(function (e) {
        alert("getUserMedia() error: " + e.name);
      });

    window.onbeforeunload = () => {
      // todo: leave room.
      this.hangup();
    };
  }

  private applyGraph(graph: Graph) {
    roomGraph = graph;
    _onGraphChange(graph);
    console.log("applying Graph", graph);

    // TODO:
    //   do hangups
    //   remove streams
    //   add streams
    const usersToConnectTo = new Set<string>();

    const { incoming, outgoing } = graph.nodes[localId()];
    for (const edgeId of [...incoming, ...outgoing]) {
      const edge = graph.edges[edgeId];
      if (!edge) {
        throw new Error("no edge for " + edgeId);
      }

      if (edge.source !== localId() && edge.sink === localId()) {
        usersToConnectTo.add(edge.source);
      } else if (edge.sink !== localId() && edge.source === localId()) {
        usersToConnectTo.add(edge.sink);
      } else if (edge.source === localId() && edge.sink === localId()) {
        throw new Error(
          "invalid edge: " + edgeId + ", both source and sink are self"
        );
      } else {
        throw new Error(
          "invalid edge: " + edgeId + ", neither source nor sink is self"
        );
      }
    }

    for (const conn of this.peers.values()) {
      if (!usersToConnectTo.has(conn.userId)) {
        this.handleRemoteHangup(conn.userId);
        this.peers.delete(conn.userId);
      }
    }

    for (const userId of usersToConnectTo) {
      let conn = this.peers.get(userId);
      if (!conn) {
        conn = this.initializeConnection(userId);
      }
      if (!conn.isStarted) {
        call(conn);
      }
    }
  }

  connect(sourceUserId: string, sinkUserId: string) {
    if (!roomGraph) {
      throw new Error("no graph");
    }

    const incomingEdge: Edge = {
      id: newId(),
      source: sinkUserId,
      sink: sourceUserId,
      tracks: [],
    };

    const outgoingEdge: Edge = {
      id: newId(),
      source: sourceUserId,
      sink: sinkUserId,
      tracks: [],
    };

    roomGraph.nodes[sinkUserId].incoming.push(outgoingEdge.id);
    roomGraph.nodes[sinkUserId].outgoing.push(incomingEdge.id);
    roomGraph.nodes[sourceUserId].outgoing.push(outgoingEdge.id);
    roomGraph.nodes[sourceUserId].incoming.push(incomingEdge.id);

    roomGraph.edges[outgoingEdge.id] = outgoingEdge;
    roomGraph.edges[incomingEdge.id] = incomingEdge;

    socket.emit("graph", { graph: roomGraph });
  }
}

/** Send a message with the socket. */
function sendMessage(
  socket: Socket,
  message: string | Record<string, any>,
  recipientId?: string
) {
  console.log("Client sending message: ", message);
  socket.emit("message", { message, recipientId });
}

const CONSTRAINTS = {
  video: true,
  audio: true,
};

let _onStreamChange: (streams: MediaStream[]) => void = (streams) => {
  console.log("streams changed", streams);
};

export function registerOnStreamChange(
  onStreamChange: (streams: MediaStream[]) => void
) {
  _onStreamChange = onStreamChange;
}

export function clearOnStreamChange() {
  _onStreamChange = (streams) => {
    console.log("streams changed", streams);
  };
}

let _onGraphChange: (graph: Graph | undefined) => void = (graph) => {
  console.log("graph changed", graph);
};

export function registerOnGraphChange(
  onGraphChange: (graph: Graph | undefined) => void
) {
  _onGraphChange = onGraphChange;
}

export function clearOnGraphChange() {
  _onGraphChange = (graph: Graph | undefined) => {
    console.log("graph changed", graph);
  };
}

function createPeerConnection(
  userId: string,
  onRemoteTrack: (track: MediaStreamTrack) => void
): RTCPeerConnection {
  function handleIceCandidate(event: RTCPeerConnectionIceEvent) {
    console.log("icecandidate event: ", event);
    if (event.candidate) {
      sendMessage(
        socket,
        {
          type: "candidate",
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
        },
        userId
      );
    } else {
      console.log("End of candidates.");
    }
  }

  function handleTrackEvent(event: RTCTrackEvent) {
    console.log("Remote stream added.");
    onRemoteTrack(event.track);
  }

  try {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });
    pc.onicecandidate = handleIceCandidate;
    pc.ontrack = handleTrackEvent;
    console.log("Created RTCPeerConnection");
    return pc;
  } catch (e: any) {
    throw new Error("Failed to create PeerConnection, exception: " + e.message);
  }
}

async function call({ pc, userId }: GraphVcConnection): Promise<void> {
  console.log("Sending offer to peer");
  try {
    const desc = await pc.createOffer();
    pc.setLocalDescription(desc);
    console.log("setLocalAndSendMessage sending message", desc);
    sendMessage(socket, desc, userId);
  } catch (e) {
    console.log("pc.createOffer() failed", e);
  }
}

async function answer({ pc, userId }: GraphVcConnection): Promise<void> {
  console.log("Sending answer to peer.");
  try {
    const desc = await pc.createAnswer();
    pc.setLocalDescription(desc);
    sendMessage(socket, desc, userId);
  } catch (e) {
    console.log("pc.createAnswer() failed", e);
  }
}

export const graphVcService = new GraphVcService();
