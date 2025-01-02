"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphVcService = exports.clearOnGraphChange = exports.registerOnGraphChange = exports.clearOnStreamChange = exports.registerOnStreamChange = exports.GraphVcService = void 0;
const IdService_1 = require("./IdService");
const socket = io();
const ROOM = "foo";
let roomGraph;
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
class GraphVcService {
    constructor() {
        this.isChannelReady = false;
        this.peers = new Map();
    }
    initializeConnection(userId) {
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
    onLocalStream(stream) {
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
    handleRemoteHangup(userId) {
        console.log("Session terminated.");
        this.stop(userId);
    }
    // todo: there should be a connection class that
    // encapsulates the peer connection and the stream
    stop(userId) {
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
        socket.emit("create-or-join", { roomId: ROOM, user: { id: (0, IdService_1.localId)() } });
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
            }
            else if (message.type === "answer") {
                const conn = this.peers.get(senderId);
                if (!conn) {
                    throw new Error("no connection for " + senderId);
                }
                if (!conn.isStarted) {
                    conn.pc.setRemoteDescription(new RTCSessionDescription(message));
                    conn.isStarted = true;
                }
            }
            else if (message.type === "candidate") {
                const conn = this.peers.get(senderId);
                if (!conn) {
                    throw new Error("no connection for " + senderId);
                }
                var candidate = new RTCIceCandidate({
                    sdpMLineIndex: message.label,
                    candidate: message.candidate,
                });
                conn.pc.addIceCandidate(candidate);
            }
            else if (message === "bye") {
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
    applyGraph(graph) {
        roomGraph = graph;
        _onGraphChange(graph);
        console.log("applying Graph", graph);
        // TODO:
        //   do hangups
        //   remove streams
        //   add streams
        const usersToConnectTo = new Set();
        const { incoming, outgoing } = graph.nodes[(0, IdService_1.localId)()];
        for (const edgeId of [...incoming, ...outgoing]) {
            const edge = graph.edges[edgeId];
            if (!edge) {
                throw new Error("no edge for " + edgeId);
            }
            if (edge.source !== (0, IdService_1.localId)() && edge.sink === (0, IdService_1.localId)()) {
                usersToConnectTo.add(edge.source);
            }
            else if (edge.sink !== (0, IdService_1.localId)() && edge.source === (0, IdService_1.localId)()) {
                usersToConnectTo.add(edge.sink);
            }
            else if (edge.source === (0, IdService_1.localId)() && edge.sink === (0, IdService_1.localId)()) {
                throw new Error("invalid edge: " + edgeId + ", both source and sink are self");
            }
            else {
                throw new Error("invalid edge: " + edgeId + ", neither source nor sink is self");
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
    connect(sourceUserId, sinkUserId) {
        if (!roomGraph) {
            throw new Error("no graph");
        }
        const incomingEdge = {
            id: (0, IdService_1.newId)(),
            source: sinkUserId,
            sink: sourceUserId,
            tracks: [],
        };
        const outgoingEdge = {
            id: (0, IdService_1.newId)(),
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
exports.GraphVcService = GraphVcService;
/** Send a message with the socket. */
function sendMessage(socket, message, recipientId) {
    console.log("Client sending message: ", message);
    socket.emit("message", { message, recipientId });
}
const CONSTRAINTS = {
    video: true,
    audio: true,
};
let _onStreamChange = (streams) => {
    console.log("streams changed", streams);
};
function registerOnStreamChange(onStreamChange) {
    _onStreamChange = onStreamChange;
}
exports.registerOnStreamChange = registerOnStreamChange;
function clearOnStreamChange() {
    _onStreamChange = (streams) => {
        console.log("streams changed", streams);
    };
}
exports.clearOnStreamChange = clearOnStreamChange;
let _onGraphChange = (graph) => {
    console.log("graph changed", graph);
};
function registerOnGraphChange(onGraphChange) {
    _onGraphChange = onGraphChange;
}
exports.registerOnGraphChange = registerOnGraphChange;
function clearOnGraphChange() {
    _onGraphChange = (graph) => {
        console.log("graph changed", graph);
    };
}
exports.clearOnGraphChange = clearOnGraphChange;
function createPeerConnection(userId, onRemoteTrack) {
    function handleIceCandidate(event) {
        console.log("icecandidate event: ", event);
        if (event.candidate) {
            sendMessage(socket, {
                type: "candidate",
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate,
            }, userId);
        }
        else {
            console.log("End of candidates.");
        }
    }
    function handleTrackEvent(event) {
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
    }
    catch (e) {
        throw new Error("Failed to create PeerConnection, exception: " + e.message);
    }
}
function call({ pc, userId }) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Sending offer to peer");
        try {
            const desc = yield pc.createOffer();
            pc.setLocalDescription(desc);
            console.log("setLocalAndSendMessage sending message", desc);
            sendMessage(socket, desc, userId);
        }
        catch (e) {
            console.log("pc.createOffer() failed", e);
        }
    });
}
function answer({ pc, userId }) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Sending answer to peer.");
        try {
            const desc = yield pc.createAnswer();
            pc.setLocalDescription(desc);
            sendMessage(socket, desc, userId);
        }
        catch (e) {
            console.log("pc.createAnswer() failed", e);
        }
    });
}
exports.graphVcService = new GraphVcService();
