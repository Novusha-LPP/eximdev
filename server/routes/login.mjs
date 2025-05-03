import express from "express";
import bcrypt from "bcrypt";
import UserModel from "../model/userModel.mjs";
import {
  generateRefreshToken,
  generateToken,
  sanitizeUserData,
} from "../auth/auth.mjs";

const router = express.Router();

// 🔐 Login Route
router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not registered" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    const userResponse = sanitizeUserData(user);

    // Set HttpOnly secure token cookie
    res.cookie("access_token", token, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
     // secure: true,
     // sameSite: "strict",
      //domain:".alvision.in",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
     // secure: true,
      sameSite: "strict",
      //domain:".alvision.in",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json(userResponse);
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 🚪 Logout Route
// router.post("/api/logout", (req, res) => {
//   res.clearCookie("exim_token");
//   return res.status(200).json({ message: "Logged out successfully" });
// });

export default router;
