const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;

app.use(express.static(__dirname));

const rooms = new Map();

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, {
      users: new Map(),
      messages: []
    });
  }

  return rooms.get(code);
}

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ code, name }) => {
    code = cleanText(code, 50);
    name = cleanText(name, 24);

    if (!code || !name) {
      socket.emit("joinError", "Enter a chat code and a display name.");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      socket.emit("joinError", "The code can only contain letters, numbers, _ and -.");
      return;
    }

    if (socket.data.roomCode) {
      socket.leave(socket.data.roomCode);

      const oldRoom = rooms.get(socket.data.roomCode);

      if (oldRoom) {
        oldRoom.users.delete(socket.id);

        if (oldRoom.users.size === 0) {
          rooms.delete(socket.data.roomCode);
        }
      }
    }

    const room = getRoom(code);

    room.users.set(socket.id, name);

    socket.data.roomCode = code;
    socket.data.name = name;

    socket.join(code);

    socket.emit("joined", {
      code,
      name
    });

    socket.emit("messageHistory", room.messages);

    io.to(code).emit("systemMessage", `${name} joined the chat.`);

    io.to(code).emit("userCount", room.users.size);
  });

  socket.on("sendMessage", (message) => {
    const code = socket.data.roomCode;
    const name = socket.data.name;

    if (!code || !name) {
      return;
    }

    const text = cleanText(message, 500);

    if (!text) {
      return;
    }

    const newMessage = {
      name,
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      })
    };

    const room = rooms.get(code);

    if (!room) {
      return;
    }

    room.messages.push(newMessage);

    if (room.messages.length > 100) {
      room.messages.shift();
    }

    io.to(code).emit("message", newMessage);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const name = socket.data.name;

    if (!code) {
      return;
    }

    const room = rooms.get(code);

    if (!room) {
      return;
    }

    room.users.delete(socket.id);

    if (room.users.size === 0) {
      rooms.delete(code);
    } else {
      io.to(code).emit("systemMessage", `${name} left the chat.`);
      io.to(code).emit("userCount", room.users.size);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Code Chat running on port ${PORT}`);
});
