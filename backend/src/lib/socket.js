import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// -------------------- SOCKET.IO --------------------
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // frontend URL
    methods: ["GET", "POST"],
  },
});

// used to store online users
const userSocketMap = {}; // { userId: socketId }

// utility to get receiver socket id
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// -------------------- SOCKET CONNECTION --------------------
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  // ✅ Save userId from query
  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // ✅ Broadcast online users to all clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // -------------------- TYPING INDICATOR --------------------
  socket.on("typing", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", {
        userId: socket.handshake.query.userId,
      });
    }
  });

  socket.on("stopTyping", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStopTyping", {
        userId: socket.handshake.query.userId,
      });
    }
  });

  // -------------------- DISCONNECT --------------------
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    if (userId) delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// -------------------- EXPORT --------------------
export { io, app, server };
