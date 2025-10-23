import express from "express";
import { addContact, getContacts } from "../controllers/contact.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Only logged-in users can access
router.post("/add", protectRoute, addContact);
router.get("/", protectRoute, getContacts);

export default router;
