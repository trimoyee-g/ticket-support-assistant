import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { inngest } from "../inngest/client.js";

// SIGNUP
export const signup = async (req, res) => {
  const { name, email, password, skills = [] } = req.body;

  try {
    // DO NOT hash manually (schema already does it)
    const user = await User.create({ name, email, password, skills });

    await inngest.send({
      name: "user/signup",
      data: { email }
    });

    const token = jwt.sign(
      { id: user._id, roles: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ user, token });

  } catch (error) {
    console.error("Error in signup:", error);
    res.status(500).json({ error: "Signup failed" });
  }
};

// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, roles: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ user, token });

  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

// LOGOUT (JWT version = client-side)
export const logout = async (req, res) => {
  // For JWT, logout is handled on frontend (delete token)
  res.json({ message: "Logged out successfully" });
};

// UPDATE USER (admin only)
export const updateUser = async (req, res) => {
  const { skills, roles, email } = req.body;

  try {
    if (!req.user?.roles?.includes("admin")) {
      return res.status(403).json({ error: "Admins only" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      {
        ...(skills && { skills }),
        ...(roles && { roles })
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User updated", user });

  } catch (error) {
    console.error("Error in updateUser:", error);
    res.status(500).json({ error: "Update failed" });
  }
};

// GET USERS (admin only)
export const getUsers = async (req, res) => {
  try {
    if (!req.user?.roles?.includes("admin")) {
      return res.status(403).json({ error: "Admins only" });
    }

    const users = await User.find().select("-password");

    res.json({ users });

  } catch (error) {
    console.error("Error in getUsers:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};