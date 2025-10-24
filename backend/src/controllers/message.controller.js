import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// ✅ Get sidebar users
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const user = await User.findById(loggedInUserId).select("recentChats");
    if (!user) return res.status(404).json({ error: "User not found" });

    const recentUsers = await User.find({
      _id: { $in: user.recentChats || [] },
    }).select("fullName email profilePic _id");

    const sidebarUsers = recentUsers.filter(
      (u) => u._id.toString() !== loggedInUserId.toString()
    );

    res.status(200).json(sidebarUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get messages between two users
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      deletedFor: { $ne: myId },
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Send message
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!receiverId || receiverId === senderId.toString())
      return res.status(400).json({ error: "Invalid receiver" });

    let imageUrl = null;
    if (image) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      } catch (err) {
        console.error("Cloudinary upload failed:", err.message);
      }
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    // Update recentChats
    await User.findByIdAndUpdate(senderId, {
      $addToSet: { recentChats: receiverId },
    });
    await User.findByIdAndUpdate(receiverId, {
      $addToSet: { recentChats: senderId },
    });

    // ✅ Emit to both sender & receiver sockets
    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);

    if (receiverSocketId)
      io.to(receiverSocketId).emit("newMessage", newMessage);
    if (senderSocketId) io.to(senderSocketId).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("SendMessage failed:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Delete message for me
export const deleteMessageForMe = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    // Emit delete event to self (for instant UI refresh)
    const selfSocket = getReceiverSocketId(userId);
    if (selfSocket) io.to(selfSocket).emit("messageDeletedForMe", message._id);

    res.json({
      message: "Message deleted for you",
      deletedMessageId: message._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete message" });
  }
};

// ✅ Delete message for everyone
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    message.text = "deleted";
    message.isDeletedForEveryone = true;
    await message.save();

    const senderSocketId = getReceiverSocketId(message.senderId);
    const receiverSocketId = getReceiverSocketId(message.receiverId);

    // ✅ Emit event to both sender & receiver
    io.emit("messageDeletedForEveryone", message);

    res.json({
      message: "Message deleted for everyone",
      deletedMessage: message,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete message" });
  }
};


// DELETE /messages/clear/:userId/for-me
export const clearChatForMe = async (req, res) => {
  try {
    const userId = req.user._id; // logged-in user
    const chatWithId = req.params.userId;

    // Delete all messages where logged-in user is sender or receiver with chatWithId
    await Message.deleteMany({
      $or: [
        { senderId: userId, receiverId: chatWithId },
        { senderId: chatWithId, receiverId: userId },
      ],
    });

    res.status(200).json({ message: "Chat cleared successfully" });
  } catch (error) {
    console.error("Error clearing chat:", error);
    res.status(500).json({ message: "Failed to clear chat" });
  }
};
