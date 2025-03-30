import express from "express";
import { authenticateJWT, sanitizeUserData } from "../auth/auth.mjs";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.get("/api/verify-session", authenticateJWT, async (req, res) => {
  try {
    // Find the user based on the decoded token
    const user = await UserModel.findById(req.user.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Return sanitized user data
    const sanitizedUser = sanitizeUserData(user);
    return res.status(200).json(sanitizedUser);
  } catch (error) {
    console.error("Session verification error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
