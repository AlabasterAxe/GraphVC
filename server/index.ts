import * as os from "os";
import * as http from "http";
import { Server } from "socket.io";

var app = http.createServer().listen(8080);

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

  socket.on("create or join", (room) => {
    log("Received request to create or join room " + room);

    log("Client ID " + socket.id + " joined room " + room);
    io.sockets.in(room).emit("join", room);
    socket.join(room);
    socket.emit("joined", room, socket.id);
    io.sockets.in(room).emit("ready");
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
