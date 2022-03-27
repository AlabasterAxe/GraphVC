/////////////////////////////////////////////

import { io } from "socket.io-client";

const ROOM = "foo";
// Could prompt for room name:
// room = prompt('Enter room name:');

export function getClient() {
  var socket = io();

  if (ROOM !== "") {
    socket.emit("create or join", ROOM);
    console.log("Attempted to create or join room", ROOM);
  }

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
    console.log.apply(console, array);
  });
}

////////////////////////////////////////////////
