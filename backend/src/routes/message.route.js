import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  clearChatForMe,
  deleteMessageForEveryone,
  deleteMessageForMe,
  getMessages,
  getUsersForSidebar,
  markMessageSeen,
  sendMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);

// Important: specific route BEFORE generic :id
router.put("/:messageId/mark-seen", protectRoute, markMessageSeen);

router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);

router.delete("/clear/:userId/for-me", protectRoute, clearChatForMe);
router.delete("/:id/for-me", protectRoute, deleteMessageForMe);
router.delete("/:id/for-everyone", protectRoute, deleteMessageForEveryone);

export default router;
