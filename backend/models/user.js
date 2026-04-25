import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email"],
    },

    password: { type: String, required: true },

    roles: {
      type: [String],
      enum: ["user", "admin", "moderator"],
      default: ["user"],
    },

    skills: [{ type: String, lowercase: true, trim: true }],

    isAvailable: { type: Boolean, default: true },

    assignedTicketsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for faster skill queries
userSchema.index({ skills: 1 });

// Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Hide password in responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model("User", userSchema);