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

const clientUserMap = new Map<string, string>();
const userClientMap = new Map<string, string>();
const roomToGraphMap = new Map<string, Graph>();

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

/** Some consistency checks on rooms, e.g. do rooms have nodes for every client? */
function validateGraph(roomId: string, graph: Graph): void {
  const clientIds = io.sockets.adapter.rooms.get(roomId) ?? new Set();
  const errors = [];

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
    errors.push(`graph node with no corresponding client: ${userId}`);
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

  socket.on(CreateOrJoin, ({ roomId, user }: CreateOrJoinRequest) => {
    log("Received request to create or join room " + roomId);

    log("Client ID " + user.id + " joined room " + roomId);
    clientUserMap.set(socket.id, user.id);
    userClientMap.set(user.id, socket.id);
    const usersInRoom = getUsersInRoom(roomId);
    const numUsers = usersInRoom ? usersInRoom.size : 0;
    let graph: Graph | undefined = roomToGraphMap.get(roomId);
    if (!graph) {
      graph = {
        nodes: {},
        edges: {},
      };
    }
    graph.nodes[user.id] = { id: user.id, incoming: [], outgoing: [] };

    log("Room " + roomId + " now has " + numUsers + " client(s)");

    if (numUsers === 0) {
      roomToGraphMap.set(roomId, graph);
      socket.join(roomId);
      log("Client ID " + user.id + " created roomId " + roomId);
      socket.emit("created", roomId, socket.id);
    } else {
      // todo: we shouldn't need to send all user ids on join anymore.
      usersInRoom.add(user.id);
      io.sockets.in(roomId).emit("join", { roomId });
      socket.join(roomId);
      socket.emit("joined", { roomId });
      io.sockets.in(roomId).emit("ready");
    }
    validateGraph(roomId, graph);
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
});

console.log("started server");
