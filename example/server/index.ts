import * as os from "os";
import * as http from "http";
import { Server } from "socket.io";
import nodeStatic from "node-static";
import { CreateOrJoin, CreateOrJoinRequest } from "../common/src/transfer";

console.log("starting server");
const fileServer = new nodeStatic.Server("../web/build");
const app = http
  .createServer(function (req, res) {
    fileServer.serve(req, res);
  })
  .listen(8080);

const clientUserMap = new Map<string, string>();

function getUserIds(clientIds: Set<string> | undefined): Set<string> {
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

var io = new Server(app);
io.sockets.on("connection", (socket) => {
  // convenience function to log server messages on the client
  function log(...args: string[]) {
    socket.emit("log", ["Message from server:", ...args]);
  }

  socket.on("message", ({ message }) => {
    log("Client said: ", message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit("message", message);
  });

  socket.on(CreateOrJoin, ({ roomId, user }: CreateOrJoinRequest) => {
    log("Received request to create or join room " + roomId);

    log("Client ID " + user.id + " joined room " + roomId);
    clientUserMap.set(socket.id, user.id);
    var clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    var numClients = clientsInRoom ? clientsInRoom.size : 0;
    log("Room " + roomId + " now has " + numClients + " client(s)");

    if (numClients === 0) {
      socket.join(roomId);
      log("Client ID " + user.id + " created roomId " + roomId);
      socket.emit("created", roomId, socket.id);
    } else {
      const currentUsers = getUserIds(clientsInRoom);
      currentUsers.add(user.id);
      io.sockets
        .in(roomId)
        .emit("join", { roomId, userIds: [...currentUsers] });
      socket.join(roomId);
      socket.emit("joined", { roomId, userIds: [...currentUsers] });
      io.sockets.in(roomId).emit("ready");
    }
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
