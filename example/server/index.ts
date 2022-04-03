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

var io = new Server(app);
io.sockets.on("connection", (socket) => {
  // convenience function to log server messages on the client
  function log(...args: string[]) {
    socket.emit("log", ["Message from server:", ...args]);
  }

  socket.on("message", (message) => {
    log("Client said: ", message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit("message", message);
  });

  socket.on(CreateOrJoin, ({ roomId, user }: CreateOrJoinRequest) => {
    log("Received request to create or join room " + roomId);

    log("Client ID " + user.id + " joined room " + roomId);
    var clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    var numClients = clientsInRoom ? clientsInRoom.size : 0;
    log("Room " + roomId + " now has " + numClients + " client(s)");

    if (numClients === 0) {
      socket.join(roomId);
      log("Client ID " + user.id + " created roomId " + roomId);
      socket.emit("created", roomId, socket.id);
    } else {
      io.sockets.in(roomId).emit("join", roomId);
      socket.join(roomId);
      socket.emit("joined", roomId, socket.id);
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
