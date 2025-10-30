import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js"; // adjust path if needed

const app = express();
const server = http.createServer(app);

// -------------------- SOCKET.IO --------------------
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // frontend URL(s)
    methods: ["GET", "POST", "PUT", "DELETE"],
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

  // Save userId from query (frontend should connect with ?userId=...)
  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // Broadcast online users to all clients
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

  // -------------------- messageDelivered (client signals that it received message) --------------------
  // Frontend receiver emits 'messageDelivered' when it receives a newMessage event (or after saving)
  socket.on("messageDelivered", async ({ messageId }) => {
    try {
      const msg = await Message.findByIdAndUpdate(
        messageId,
        { status: "delivered" },
        { new: true }
      );

      if (msg) {
        // notify sender about status change
        const senderSocketId = userSocketMap[msg.senderId?.toString()];
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdated", {
            messageId: msg._id,
            status: "delivered",
          });
        }
        // optionally also notify receiver to sync UI
        const receiverSocketId = userSocketMap[msg.receiverId?.toString()];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageStatusUpdated", {
            messageId: msg._id,
            status: "delivered",
          });
        }
      }
    } catch (err) {
      console.error("Error in messageDelivered handler:", err.message);
    }
  });

  // -------------------- markMessagesAsSeen (client requests marking message(s) as seen) --------------------
  // payload: { messageIds: [..], senderId, receiverId } OR { messageId }
  socket.on(
    "markMessagesAsSeen",
    async ({ messageIds, messageId, senderId, receiverId }) => {
      try {
        const ids = messageIds || (messageId ? [messageId] : []);
        if (ids.length === 0) return;

        const updated = await Message.updateMany(
          { _id: { $in: ids }, status: { $ne: "seen" } },
          {
            $set: { status: "seen" },
            $addToSet: { seenBy: socket.handshake.query.userId },
          }
        );

        // Emit status update per id to sender(s)
        ids.forEach((id) => {
          // find message to get senderId (optional optimization)
          // here we broadcast messageStatusUpdated, frontend will update
          io.emit("messageStatusUpdated", { messageId: id, status: "seen" });
        });

        // Additionally, inform specific sender to update UI if online
        if (senderId) {
          const senderSocketId = userSocketMap[senderId];
          if (senderSocketId) {
            io.to(senderSocketId).emit("messagesSeen", {
              senderId,
              receiverId: socket.handshake.query.userId,
              messageIds: ids,
            });
          }
        }
      } catch (err) {
        console.error(
          "Error in markMessagesAsSeen socket handler:",
          err.message
        );
      }
    }
  );

  // -------------------- DISCONNECT --------------------
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    if (userId) delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// -------------------- EXPORT --------------------
export { io, app, server };
