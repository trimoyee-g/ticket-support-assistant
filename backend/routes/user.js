import express from "express";
import {
  signup,
  login,
  logout,
  updateUser,
  getUsers
} from "../controllers/user.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";


const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.put("/update-user", authenticate, updateUser);
router.get("/users", authenticate, authorize(["admin"]), getUsers);


export default router;