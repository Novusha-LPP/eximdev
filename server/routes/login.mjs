// routes/login.mjs

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "18h";

// Helper to parse JWT_EXPIRATION to ms
const parseExpiration = (expiration) => {
  const match = expiration.match(/(\d+)([smhd])/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};

const cookieMaxAge = parseExpiration(JWT_EXPIRATION);

router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  console.log("Login Attempt:", { username, password: "[HIDDEN]" });

  if (!username || !password) {
    console.log("Missing credentials:", { username, password: !!password });
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      console.log("User not found for username:", username);
      return res.status(400).json({ message: "User not registered" });
    }

    console.log("User found:", user);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("Password mismatch for username:", username);
      return res
        .status(400)
        .json({ message: "Username or password didn't match" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    console.log("Generated JWT Token:", token);

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set secure cookies in production
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Allow cross-origin cookies
      maxAge: cookieMaxAge,
    });
    

    console.log("Auth token set in cookie:", token);

    const userResponse = {
      username: user.username,
      role: user.role,
      modules: user.modules,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      company: user.company,
      employee_photo: user.employee_photo,
      designation: user.designation,
      department: user.department,
      employment_type: user.employment_type,
      email: user.email,
    };

    console.log("Login successful, returning user response:", userResponse);

    return res
      .status(200)
      .json({ message: "Login successful", user: userResponse });
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// Get User Route
// Get User Route
router.get("/api/user", (req, res) => {
  const token = req.cookies.auth_token;

  console.debug("[Server] Incoming Cookies:", req.cookies);

  if (!token) {
    console.warn("[Server] No auth_token cookie found.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.debug("[Server] Token verified, decoded payload:", decoded);

    UserModel.findById(decoded.id)
      .select("-password")
      .then((user) => {
        if (!user) {
          console.warn("[Server] User not found for token ID:", decoded.id);
          return res.status(404).json({ message: "User not found" });
        }
        console.debug("[Server] User fetched from database:", user);
        res.status(200).json({ user });
      })
      .catch((err) => {
        console.error("[Server] Database error:", err);
        res.status(500).json({ message: "Internal server error" });
      });
  } catch (err) {
    console.error("[Server] Token verification failed:", err);
    res.status(401).json({ message: "Invalid token" });
  }
});

// Logout Route
router.post("/api/logout", (req, res) => {
  console.log("Logout request received. Clearing auth_token cookie.");
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Set secure cookies in production
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Allow cross-origin cookies
    maxAge: cookieMaxAge,
  });
  

  res.status(200).json({ message: "Logout successful" });
});

export default router;
