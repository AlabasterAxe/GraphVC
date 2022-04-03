import { Socket } from "socket.io-client";

const PC_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

declare const io: () => Socket;

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

async function doCall(socket: Socket, pc: RTCPeerConnection): Promise<void> {
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

async function doAnswer(socket: Socket, pc: RTCPeerConnection) {
  console.log("Sending answer to peer.");
  try {
    const desc = await pc.createAnswer();
    pc.setLocalDescription(desc);
    sendMessage(socket, desc);
  } catch (e) {
    console.log("pc.createAnswer() failed", e);
  }
}

export function initialize() {
  let isChannelReady = false;
  let isInitiator = false;
  let isStarted = false;
  let localStream: MediaStream | undefined;
  let remoteStream: MediaStream | undefined;
  let pc: RTCPeerConnection | undefined;

  // TODO(matt): figure out how to do this with react
  var localVideo = document.querySelector("#localVideo") as HTMLVideoElement;
  var remoteVideo = document.querySelector("#remoteVideo") as HTMLVideoElement;

  if (!localVideo || !remoteVideo) {
    throw new Error("couldn't find video elements");
  }

  var socket = io();

  const room = "foo";

  function getActiveStreams() {
    const result = [];

    if (localStream) {
      result.push(localStream);
    }

    if (remoteStream) {
      result.push(remoteStream);
    }

    return result;
  }

  function maybeStart() {
    console.log(
      ">>>>>>> maybeStart() ",
      isStarted,
      localStream,
      isChannelReady
    );
    if (!isStarted && typeof localStream !== "undefined" && isChannelReady) {
      console.log(">>>>>> creating peer connection");
      pc = createPeerConnection(socket, (track) => {
        if (!remoteStream) {
          remoteStream = new MediaStream();
          remoteVideo.srcObject = remoteStream;
          _onStreamChange(getActiveStreams());
        }
        remoteStream.addTrack(track);
      });
      for (const track of localStream.getTracks()) {
        pc.addTrack(track);
      }
      isStarted = true;
      console.log("isInitiator", isInitiator);
      if (isInitiator) {
        doCall(socket, pc);
      }
    }
  }

  function gotStream(stream: MediaStream) {
    console.log("Adding local stream.");
    localStream = stream;
    localVideo.srcObject = stream;
    sendMessage(socket, "got user media");
    _onStreamChange(getActiveStreams());
    if (isInitiator) {
      maybeStart();
    }
  }

  function hangup() {
    console.log("Hanging up.");
    stop();
    sendMessage(socket, "bye");
  }

  function handleRemoteHangup() {
    console.log("Session terminated.");
    stop();
    isInitiator = false;
  }

  function stop() {
    isStarted = false;
    if (pc) {
      pc.close();
      pc = undefined;
    }
  }

  socket.emit("create or join", room);
  console.log("Attempted to create or  join room", room);

  socket.on("created", (room) => {
    console.log("Created room " + room);
    isInitiator = true;
  });

  socket.on("full", (room) => {
    console.log("Room " + room + " is full");
  });

  socket.on("join", (room) => {
    console.log("Another peer made a request to join room " + room);
    console.log("This peer is the initiator of room " + room + "!");
    isChannelReady = true;
  });

  socket.on("joined", (room) => {
    console.log("joined: " + room);
    isChannelReady = true;
  });

  socket.on("log", (array) => {
    console.log(array);
  });

  // This client receives a message
  socket.on("message", (message) => {
    console.log("Client received message:", message);
    if (message === "got user media") {
      maybeStart();
    } else if (message.type === "offer") {
      if (!isInitiator && !isStarted) {
        maybeStart();
      }
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer(socket, pc);
      }
    } else if (message.type === "answer" && isStarted) {
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
      }
    } else if (message.type === "candidate" && isStarted) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate,
      });
      if (pc) {
        pc.addIceCandidate(candidate);
      }
    } else if (message === "bye" && isStarted) {
      handleRemoteHangup();
    }
  });

  console.log("Getting user media with constraints", CONSTRAINTS);
  navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: true,
    })
    .then(gotStream)
    .catch(function (e) {
      alert("getUserMedia() error: " + e.name);
    });

  window.onbeforeunload = function () {
    sendMessage(socket, "bye");
  };
}
