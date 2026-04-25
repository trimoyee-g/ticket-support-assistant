import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.js";
import User from "../models/user.js";
import { sendMail } from "../utils/mailer.js";

const DAYS_14_MS = 14 * 24 * 60 * 60 * 1000;

// CREATE TICKET
export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        error: "Title and description are required"
      });
    }

    const newTicket = await Ticket.create({
      title,
      description,
      createdBy: req.user.id
    });

    await inngest.send({
      name: "ticket/created",
      data: {
        ticketId: newTicket._id.toString(),
        title,
        description,
        createdBy: req.user.id,
        email: req.user.email
      }
    });

    return res.status(201).json({
      message: "Ticket created successfully and processing",
      ticket: newTicket
    });

  } catch (error) {
    console.error("Error in createTicket:", error);
    res.status(500).json({ message: "Failed to create ticket" });
  }
};

// GET TICKETS
export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    let tickets;

    if (user.roles.includes("admin")) {
      tickets = await Ticket.find()
        .populate("assignedTo", "email")
        .sort({ createdAt: -1 });

    } else if (user.roles.includes("moderator")) {
      // moderator sees assigned tickets (or later team-based)
      tickets = await Ticket.find({
        assignedTo: user.id
      })
        .populate("assignedTo", "email")
        .sort({ createdAt: -1 });

    } else {
      // normal user → only own tickets
      tickets = await Ticket.find({
        createdBy: user.id
      })
        .select("title description status assignedTo createdAt updatedAt")
        .sort({ createdAt: -1 });
    }

    return res.status(200).json(tickets);

  } catch (error) {
    console.error("Error in getTickets:", error);
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
};

// GET TICKET BY ID
export const getTicketById = async (req, res) => {
  try {
    const user = req.user;
    let ticket;

    if (user.roles.includes("admin") || user.roles.includes("moderator")) {
      ticket = await Ticket.findById(req.params.id)
        .populate("assignedTo", "email")
        .lean();
      // ensure messages included for moderators/admins
      if (ticket && !ticket.messages) ticket.messages = [];

    } else {
      ticket = await Ticket.findOne({
        _id: req.params.id,
        createdBy: user.id
      }).select("title description status assignedTo createdAt updatedAt messages").lean();
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json(ticket);

  } catch (error) {
    console.error("Error in getTicketById:", error);
    res.status(500).json({ message: "Failed to fetch ticket" });
  }
};

// USER: Close own ticket with a message
export const closeTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Only creator or admin/moderator can close on behalf
    const isOwner = ticket.createdBy?.toString() === req.user.id;
    const isPrivileged = req.user.roles?.includes("admin") || req.user.roles?.includes("moderator");
    if (!isOwner && !isPrivileged) return res.status(403).json({ message: "Forbidden" });

    ticket.status = "closed";
    ticket.closedMessage = req.body.message || "";
    ticket.closedBy = req.user.id;
    ticket.closedAt = new Date();
    ticket.autoDeleteAt = new Date(Date.now() + DAYS_14_MS);

    await ticket.save();

    return res.status(200).json({ message: "Ticket closed", ticket });
  } catch (error) {
    console.error("Error in closeTicket:", error);
    res.status(500).json({ message: "Failed to close ticket" });
  }
};

// MODERATOR/ADMIN: mark as resolved with a message and email the user
export const resolveTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "resolved";
    ticket.resolutionMessage = req.body.message || "";
    ticket.resolvedAt = new Date();
    ticket.resolvedBy = req.user.id;
    ticket.autoDeleteAt = new Date(Date.now() + DAYS_14_MS);

    await ticket.save();

    // notify creator
    try {
      const creator = await User.findById(ticket.createdBy);
      if (creator && creator.email) {
        const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
        const reopenUrl = `${frontend}/tickets/${ticket._id}?havingIssue=true`;
        await sendMail(
          creator.email,
          `Your ticket "${ticket.title}" was resolved`,
          `Hi ${creator.name || ''},\n\nYour ticket has been marked resolved by our team.\n\nMessage from moderator: ${ticket.resolutionMessage}\n\nIf you still have an issue, click here: ${reopenUrl}`,
          `<p>Hi ${creator.name || ''},</p><p>Your ticket has been marked <strong>resolved</strong> by our team.</p><p>Moderator message: ${ticket.resolutionMessage}</p><p>If you still have an issue, <a href="${reopenUrl}">click here</a> to let us know.</p>`
        );
      }
    } catch (mailErr) {
      console.error("Failed sending resolution email:", mailErr);
    }

    return res.status(200).json({ message: "Ticket resolved", ticket });
  } catch (error) {
    console.error("Error in resolveTicket:", error);
    res.status(500).json({ message: "Failed to resolve ticket" });
  }
};

// USER: reopen ticket / raise "having issue"
export const reopenTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Only creator can reopen
    if (ticket.createdBy?.toString() !== req.user.id) return res.status(403).json({ message: "Forbidden" });

    ticket.status = "open";
    ticket.autoDeleteAt = null;
    ticket.closedMessage = undefined;
    ticket.resolutionMessage = undefined;
    ticket.closedAt = undefined;
    ticket.resolvedAt = undefined;

    await ticket.save();

    return res.status(200).json({ message: "Ticket reopened", ticket });
  } catch (error) {
    console.error("Error in reopenTicket:", error);
    res.status(500).json({ message: "Failed to reopen ticket" });
  }
};

// Cleanup: delete tickets whose autoDeleteAt has passed
export const deleteExpiredTickets = async () => {
  try {
    const now = new Date();
    const res = await Ticket.deleteMany({ autoDeleteAt: { $lte: now } });
    if (res.deletedCount) console.log(`Auto-deleted ${res.deletedCount} tickets`);
  } catch (error) {
    console.error("Error deleting expired tickets:", error);
  }
};

// Add message to ticket (also used by socket handler)
export const addMessage = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { text, role } = req.body;
    if (!text) return res.status(400).json({ message: 'Message text required' });

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const message = {
      sender: req.user?.id || null,
      name: req.user?.email || 'Unknown',
      role: role || 'user',
      text,
      createdAt: new Date()
    };

    ticket.messages = ticket.messages || [];
    ticket.messages.push(message);
    await ticket.save();

    // emit via socket if available
    try {
      const { getIo } = await import('../socket.js');
      const io = getIo();
      if (io) io.to(`ticket_${ticketId}`).emit('message', { ticketId, message });
    } catch (emitErr) {
      // ignore emit errors
      console.error('emit error', emitErr);
    }

    return res.status(201).json({ message: 'Message added', ticket, added: message });
  } catch (error) {
    console.error('Error in addMessage:', error);
    res.status(500).json({ message: 'Failed to add message' });
  }
};