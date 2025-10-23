import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// GET sidebar users
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const user = await User.findById(loggedInUserId).select("recentChats");

    if (!user) return res.status(404).json({ error: "User not found" });

    // Fetch user details for recentChats IDs
    const recentUsers = await User.find({
      _id: { $in: user.recentChats || [] },
    }).select("fullName email profilePic _id");

    // Sidebar users = recentChats except logged-in user
    const sidebarUsers = recentUsers.filter(
      (u) => u._id.toString() !== loggedInUserId.toString()
    );

    res.status(200).json(sidebarUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET messages between logged-in user and another user
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 }); // Sort by oldest first

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// SEND message
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

    // Save message
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });
    await newMessage.save();

    // Update recentChats for both users (avoid duplicates)
    await User.findByIdAndUpdate(senderId, {
      $addToSet: { recentChats: receiverId },
    });
    await User.findByIdAndUpdate(receiverId, {
      $addToSet: { recentChats: senderId },
    });

    // Emit real-time message to receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId)
      io.to(receiverSocketId).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("SendMessage failed:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
