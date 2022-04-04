import { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { Graph } from "./model/model";

declare const io: () => Socket;

const socket = io();
const ROOM = "foo";

type User = {
  id: string;
};

export class GraphVcService {
  isChannelReady = false;
  isInitiator = true;
  isStarted = false;
  localStream: MediaStream | undefined;
  remoteStream: MediaStream | undefined;
  pc: RTCPeerConnection | undefined;

  readonly id = uuidv4();

  maybeStart() {
    console.log(
      ">>>>>>> maybeStart() ",
      this.isStarted,
      this.localStream,
      this.isChannelReady
    );
    if (
      !this.isStarted &&
      typeof this.localStream !== "undefined" &&
      this.isChannelReady
    ) {
      console.log(">>>>>> creating peer connection");
      this.pc = createPeerConnection(socket, (track) => {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
          _onStreamChange(this.getActiveStreams());
        }
        this.remoteStream.addTrack(track);
      });
      for (const track of this.localStream.getTracks()) {
        this.pc.addTrack(track);
      }
      this.isStarted = true;
      console.log("isInitiator", this.isInitiator);
      if (this.isInitiator) {
        call(this.pc);
      }
    }
  }

  getActiveStreams() {
    const result = [];

    if (this.localStream) {
      result.push(this.localStream);
    }

    if (this.remoteStream) {
      result.push(this.remoteStream);
    }

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
    this.stop();
    sendMessage(socket, "bye");
  }

  handleRemoteHangup() {
    console.log("Session terminated.");
    this.stop();
    this.isInitiator = false;
  }

  stop() {
    this.isStarted = false;
    if (this.pc) {
      this.pc.close();
      this.pc = undefined;
    }
  }

  initialize() {
    socket.emit("create-or-join", { roomId: ROOM, user: { id: this.id } });
    console.log("Attempted to create or  join room", ROOM);

    socket.on("created", (room) => {
      console.log("Created room " + room);
      this.isInitiator = true;
      _onParticipantsChange([{ id: this.id }]);
    });

    socket.on("full", (room) => {
      console.log("Room " + room + " is full");
    });

    socket.on("graph", (graph) => {
      console.log("got new graph", graph);
      this.applyGraph(graph);
    });

    socket.on("join", ({ roomId, userId }) => {
      console.log(`User Id ${userId} made a request to join room ` + roomId);
      console.log("This peer is the initiator of room " + roomId + "!");
      _onParticipantsChange([{ id: this.id }, { id: userId }]);
      this.isChannelReady = true;
    });

    socket.on("joined", (room) => {
      // TODO (matt): send the existing participants
      console.log("joined: " + room);
      this.isChannelReady = true;
    });

    socket.on("log", (array) => {
      console.log(array);
    });

    // This client receives a message
    socket.on("message", (message) => {
      console.log("Client received message:", message);
      if (message.type === "offer") {
        if (!this.isStarted) {
          this.isInitiator = false;
          this.maybeStart();
        }
        if (this.pc) {
          this.pc.setRemoteDescription(new RTCSessionDescription(message));
          answer(this.pc);
        }
      } else if (message.type === "answer" && this.isStarted) {
        if (this.pc) {
          this.pc.setRemoteDescription(new RTCSessionDescription(message));
        }
      } else if (message.type === "candidate" && this.isStarted) {
        var candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        });
        if (this.pc) {
          this.pc.addIceCandidate(candidate);
        }
      } else if (message === "bye" && this.isStarted) {
        this.handleRemoteHangup();
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

    window.onbeforeunload = function () {
      sendMessage(socket, "bye");
    };
  }

  private applyGraph(graph: Graph) {
    console.log("applying Graph", graph);
  }

  connect(userId: string) {}
}

/** Send a message with the socket. */
function sendMessage(socket: Socket, message: string | Record<string, any>) {
  console.log("Client sending message: ", message);
  socket.emit("message", message);
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

let _onParticipantsChange: (users: User[]) => void = (users) => {
  console.log("streams changed", users);
};

export function registerOnParticipantsChange(
  onParticipantsChange: (users: User[]) => void
) {
  _onParticipantsChange = onParticipantsChange;
}

export function clearOnParticipantsChange() {
  _onParticipantsChange = (users: User[]) => {
    console.log("participants changed", users);
  };
}

function createPeerConnection(
  socket: Socket,
  onRemoteTrack: (track: MediaStreamTrack) => void
): RTCPeerConnection {
  function handleIceCandidate(event: RTCPeerConnectionIceEvent) {
    console.log("icecandidate event: ", event);
    if (event.candidate) {
      sendMessage(socket, {
        type: "candidate",
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
      });
    } else {
      console.log("End of candidates.");
    }
  }

  function handleTrackEvent(event: RTCTrackEvent) {
    console.log("Remote stream added.");
    onRemoteTrack(event.track);
  }

  try {
    const pc = new RTCPeerConnection();
    pc.onicecandidate = handleIceCandidate;
    pc.ontrack = handleTrackEvent;
    console.log("Created RTCPeerConnection");
    return pc;
  } catch (e: any) {
    throw new Error("Failed to create PeerConnection, exception: " + e.message);
  }
}

async function call(pc: RTCPeerConnection): Promise<void> {
  console.log("Sending offer to peer");
  try {
    const desc = await pc.createOffer();
    pc.setLocalDescription(desc);
    console.log("setLocalAndSendMessage sending message", desc);
    sendMessage(socket, desc);
  } catch (e) {
    console.log("pc.createOffer() failed", e);
  }
}

async function answer(pc: RTCPeerConnection) {
  console.log("Sending answer to peer.");
  try {
    const desc = await pc.createAnswer();
    pc.setLocalDescription(desc);
    sendMessage(socket, desc);
  } catch (e) {
    console.log("pc.createAnswer() failed", e);
  }
}

export const graphVcService = new GraphVcService();
