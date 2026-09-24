import express from "express";
import jwt from "jsonwebtoken";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.post("/api/logout", async (req, res) => {
  try {
    // Extract token to identify user and invalidate active sessions across all devices
    let token = req.cookies?.token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded._id) {
          // Increment tokenVersion so all other active devices/sessions are invalidated
          await UserModel.findByIdAndUpdate(decoded._id, {
            $inc: { tokenVersion: 1 }
          });
        }
      } catch (tokenErr) {
        console.warn("Could not decode token during logout:", tokenErr.message);
      }
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };

    res.clearCookie("token", cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout route error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
});

export default router;
