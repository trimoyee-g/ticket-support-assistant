import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },

    description: String,

    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        role: {
          type: String,
          enum: ["member", "moderator"],
          default: "member",
        },
      },
    ],

    // Skills this team handles
    skills: [{ type: String, lowercase: true, trim: true }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for AI-based routing
teamSchema.index({ skills: 1 });

export default mongoose.model("Team", teamSchema);