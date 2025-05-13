import express from "express";
import jwt from "jsonwebtoken";
import {
  authenticateJWT,
  sanitizeUserData,
  generateToken,
} from "../auth/auth.mjs";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

// Debugging middleware to inspect cookies and headers


// Attempt to authenticate with either cookie or Authorization header
router.get("/api/verify-session", async (req, res) => {
  try {
    // Check for token in either cookie or Authorization header
    let token = null;

    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: "Invalid session" });
    }

    // Find the user based on the decoded token
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Return sanitized user data
    const sanitizedUser = sanitizeUserData(user);
    return res.status(200).json(sanitizedUser);
  } catch (error) {
    console.error("Session verification error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    return res.status(401).json({ message: "Authentication required" });
  }
});

router.post("/api/refresh-token", async (req, res) => {
  try {
    // Try to get refresh token from cookie first, then from the request body
    const refreshToken = req.cookies.refresh_token || req.body.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const newAccessToken = generateToken(user);

    // Set cookie with more permissive settings for cross-origin
    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      // sameSite: "none", // Changed from strict to none to allow cross-origin
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: "/",
    });

    // Also return the token in the response body
    res.status(200).json({
      ...sanitizeUserData(user),
      token: newAccessToken, // Include token in response for clients that can't use cookies
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(403).json({ message: "Invalid refresh token" });
  }
});

export default router;
