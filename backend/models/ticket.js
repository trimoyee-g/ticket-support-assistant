import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    description: { type: String, required: true },

    status: {
      type: String,
      enum: ["open", "assigned", "in_progress", "resolved", "closed"],
      default: "open",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Team routing
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },

    assignedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    deadline: Date,

    // 🤖 AI OUTPUT FIELDS
    aiSummary: String,

    aiSuggestedSolution: String,

    relatedSkills: [{ type: String, lowercase: true, trim: true }],

    // Internal notes (admin/moderator)
    internalNotes: String,

    assignedAt: Date,

    resolvedAt: Date,

    resolutionMessage: String,

    closedMessage: String,

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    closedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    autoDeleteAt: Date,
    // Conversation messages thread for this ticket
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: String,
        role: { type: String, enum: ["user", "moderator", "system"], default: "user" },
        text: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],

  },

  { timestamps: true },
  
);

// Index for matching
ticketSchema.index({ relatedSkills: 1 });

export default mongoose.model("Ticket", ticketSchema);
