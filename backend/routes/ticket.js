import express from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";

import {
  getTickets,
  getTicketById,
  createTicket,
  closeTicket,
  resolveTicket,
  reopenTicket
} from "../controllers/ticket.js";
import { addMessage } from "../controllers/ticket.js";

const router = express.Router();

// Get tickets (filtered inside controller based on role)
router.get("/", authenticate, getTickets);

// Get single ticket
router.get("/:id", authenticate, getTicketById);

// Create ticket
router.post("/", authenticate, createTicket);

// Update ticket (status, notes, etc.)
// Close ticket (owner or admin)
router.put("/:id/close", authenticate, closeTicket);

// Resolve ticket (moderator/admin)
router.put("/:id/resolve", authenticate, authorize(["admin", "moderator"]), resolveTicket);



// Reopen ticket (owner)
router.put("/:id/reopen", authenticate, reopenTicket);

// Add message to ticket (conversation thread)
router.post("/:id/messages", authenticate, addMessage);
export default router;