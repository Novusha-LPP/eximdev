import express from "express";
import jwt from "jsonwebtoken";
import {
  authenticateJWT,
  sanitizeUserData,
  generateToken,
} from "../auth/auth.mjs";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.get(
  "/api/verify-session",
  (req, res, next) => {
    // console.log("Cookies received:", req.cookies);
    // console.log("Headers:", req.headers);
    next();
  },
  authenticateJWT, // Ensure this middleware is properly invoked
  async (req, res) => {
    // console.log("User authenticated:", req.user);

    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: "Invalid session" });
      }

      // Find the user based on the decoded token
      const user = await UserModel.findById(req.user.userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Return sanitized user data
      const sanitizedUser = sanitizeUserData(user);
      return res.status(200).json(sanitizedUser);
    } catch (error) {
      // console.error("Session verification error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

router.post("/api/refresh-token", async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken)
    return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await UserModel.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const newAccessToken = generateToken(user);

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      //secure: true,
      //sameSite: "strict",
      // domain: ".alvision.in",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    res.status(200).json(sanitizeUserData(user));
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(403).json({ message: "Invalid refresh token" });
  }
});

export default router;
