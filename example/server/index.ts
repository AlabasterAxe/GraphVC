import * as os from "os";
import * as http from "http";
import { Server } from "socket.io";
import nodeStatic from "node-static";
import { CreateOrJoin, CreateOrJoinRequest } from "../common/src/transfer";
// todo: figure out how to share deps
import { Graph, Node } from "../web/src/model/model";

console.log("starting server");
const fileServer = new nodeStatic.Server("../web/build");
const app = http
  .createServer(function (req, res) {
    fileServer.serve(req, res);
  })
  .listen(8080);

/** Used for when we have a client id but we want a userId. */
const clientUserMap = new Map<string, string>();

/** Used for sending a message to a specific user */
const userClientMap = new Map<string, string>();

const roomGraphMap = new Map<string, Graph>();

/** Used for keeping track of which room a user is in */
const userRoomMap = new Map<string, string>();

function getUsersInRoom(roomId: string): Set<string> {
  const clientIds = io.sockets.adapter.rooms.get(roomId);
  const result = new Set<string>();

  if (!clientIds) {
    return result;
  }

  for (const clientId of clientIds.values()) {
    const userId = clientUserMap.get(clientId);
    if (userId) {
      result.add(userId);
    }
  }
  return result;
}

function removeUserFromRoom(roomId: string, userId: string): void {
  const graph = roomGraphMap.get(roomId);
  if (!graph) {
    throw new Error(`no graph for room ${roomId}`);
  }

  const node = graph.nodes[userId];

  if (!node) {
    throw new Error(`no node for user ${userId} in room ${roomId}`);
  }

  for (const edgeId of node.incoming) {
    const edge = graph.edges[edgeId];
    graph.nodes[edge.source].outgoing = graph.nodes[
      edge.source
    ].outgoing.filter((x) => x !== edgeId);
    delete graph.edges[edgeId];
  }

  for (const edgeId of node.outgoing) {
    const edge = graph.edges[edgeId];
    graph.nodes[edge.sink].incoming = graph.nodes[edge.sink].incoming.filter(
      (x) => x !== edgeId
    );
    delete graph.edges[edgeId];
  }

  delete graph.nodes[userId];

  userRoomMap.delete(userId);
}

type ReferenceType = "reference" | "entity";
type ReferenceSummary = Record<string, ReferenceType[]>;

function validateReferences(graph: Graph): string[] {
  const references: ReferenceSummary = {};
  const errors = [];
  for (const [key, { id, incoming, outgoing }] of Object.entries(graph.nodes)) {
    if (key !== id) {
      errors.push(`node key ${key} does not match id ${id}`);
      continue;
    }
    references[id] = ["entity"];
    for (const edgeId of [...incoming, ...outgoing]) {
      if (!references[edgeId]) {
        references[edgeId] = [];
      }
      references[edgeId].push("reference");
    }
  }

  for (const [key, { id, source, sink }] of Object.entries(graph.edges)) {
    if (key !== id) {
      errors.push(`edge key ${key} does not match id ${id}`);
      continue;
    }
    if (!references[id]) {
      references[id] = [];
    }
    references[id].push("entity");
    for (const nodeId of [source, sink]) {
      if (!references[nodeId]) {
        references[nodeId] = [];
      }
      references[nodeId].push("reference");
    }
  }

  for (const [id, referenceTypes] of Object.entries(references)) {
    if (referenceTypes.every((type) => type !== "entity")) {
      errors.push(`dangling reference to entity ${id}`);
    }
  }

  return errors;
}

/** Some consistency checks on rooms, e.g. do rooms have nodes for every client? */
function validateGraph(roomId: string, graph: Graph): void {
  const clientIds = io.sockets.adapter.rooms.get(roomId) ?? new Set();
  const errors = validateReferences(graph);

  const userIdSet = new Set<string>(Object.keys(graph.nodes));
  for (const clientId of clientIds) {
    const userId = clientUserMap.get(clientId);
    if (!userId) {
      errors.push(`client ${clientId} has no userId`);
      continue;
    }

    if (!userIdSet.delete(userId)) {
      errors.push(`graph has no node for user ${userId}`);
      continue;
    }
  }

  for (const userId of userIdSet) {
    errors.push(`user id with no corresponding client: ${userId}`);
  }

  if (errors.length > 0) {
    throw new Error(
      `validation errors for room ${roomId}: \n\n  ${errors.join("\n  ")}`
    );
  }
}

var io = new Server(app);
io.sockets.on("connection", (socket) => {
  // convenience function to log server messages on the client
  function log(...args: string[]) {
    socket.emit("log", ["Message from server:", ...args]);
  }

  socket.on("message", ({ message, recipientId }) => {
    log("Client said: ", message);
    if (recipientId) {
      const clientId = userClientMap.get(recipientId);
      if (clientId) {
        io.to(clientId).emit("message", {
          message,
          senderId: clientUserMap.get(socket.id),
        });
      } else {
        // TODO (matt): send error
        console.log("No client found for recipientId", recipientId);
      }
    }
    // one socket should only be a member of one room so we should just
    // send this to the room that its in.
    socket.broadcast.emit("message", {
      message,
      senderId: clientUserMap.get(socket.id),
    });
  });

  socket.on("graph", ({ graph }) => {
    const userId = clientUserMap.get(socket.id);
    if (!userId) {
      throw new Error("no userId for client");
    }

    const roomId = userRoomMap.get(userId);
    if (!roomId) {
      throw new Error("no roomId for user");
    }

    const roomGraph = roomGraphMap.get(roomId);
    if (!roomGraph) {
      throw new Error("no roomGraph for room");
    }

    roomGraph.nodes = { ...roomGraph.nodes, ...graph.nodes };
    roomGraph.edges = { ...roomGraph.edges, ...graph.edges };

    validateGraph(roomId, roomGraph);

    socket.to(roomId).emit("graph", { graph, senderId: userId });
  });

  socket.on(CreateOrJoin, ({ roomId, user }: CreateOrJoinRequest) => {
    // todo: remove user from any previous rooms.
    log("Received request to create or join room " + roomId);

    log("Client ID " + user.id + " joined room " + roomId);
    clientUserMap.set(socket.id, user.id);
    userClientMap.set(user.id, socket.id);
    const users = getUsersInRoom(roomId);
    let graph: Graph | undefined = roomGraphMap.get(roomId);
    if (!graph) {
      graph = {
        nodes: {},
        edges: {},
      };
      roomGraphMap.set(roomId, graph);
    }
    graph.nodes[user.id] = { id: user.id, incoming: [], outgoing: [] };

    log("Room " + roomId + " now has " + users.size + " client(s)");

    if (users.size === 0) {
      socket.join(roomId);
      log("Client ID " + user.id + " created roomId " + roomId);
      socket.emit("created", roomId, socket.id);
    } else {
      io.sockets.in(roomId).emit("join", { roomId });
      socket.join(roomId);
      socket.emit("joined", { roomId });
      io.sockets.in(roomId).emit("ready");
    }
    validateGraph(roomId, graph);
    userRoomMap.set(user.id, roomId);
    io.to(roomId).emit("graph", { graph, senderId: user.id });
  });

  socket.on("ipaddr", () => {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      const device = ifaces[dev];
      if (device) {
        device.forEach((details: any) => {
          if (details.family === "IPv4" && details.address !== "127.0.0.1") {
            socket.emit("ipaddr", details.address);
          }
        });
      }
    }
  });

  socket.on("bye", function () {
    console.log("received bye");
  });

  socket.on("disconnect", (reason) => {
    const userId = clientUserMap.get(socket.id);
    if (!userId) {
      return;
    }

    clientUserMap.delete(socket.id);
    userClientMap.delete(userId);
    const roomId = userRoomMap.get(userId);
    if (!roomId) {
      return;
    }

    removeUserFromRoom(roomId, userId);
  });
});

console.log("started server");
