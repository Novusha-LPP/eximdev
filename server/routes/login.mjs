import express from "express";
import bcrypt from "bcrypt";
import UserModel from "../model/userModel.mjs";
import {
  sanitizeUserData,
  generateToken,
  generateRefreshToken,
} from "../auth/auth.mjs";

const router = express.Router();

router.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Find the user
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Determine if we're in production
    const isProduction = process.env.NODE_ENV === "production";

    // Set access token cookie - more permissive for cross-origin
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      // secure: isProduction,
      // sameSite: isProduction ? "none" : "lax", // Allow cross-origin in production
      sameSite: "none", // Changed from strict to none to allow cross-origin
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: "/",
    });

    // Set refresh token cookie - more permissive for cross-origin
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      // sameSite: isProduction ? "none" : "lax", // Allow cross-origin in production
      sameSite: "none", // Changed from strict to none to allow cross-origin
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Return user data and tokens in body as well (for clients that can't use cookies)
    const sanitizedUser = sanitizeUserData(user);
    return res.status(200).json({
      ...sanitizedUser,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
