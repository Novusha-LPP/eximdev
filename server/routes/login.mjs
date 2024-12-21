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

// Login Route
router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not registered" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ message: "Username or password didn't match" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: "Lax", // Adjust based on environment
      maxAge: cookieMaxAge,
    });
    // console.log("Auth token set in cookie:", token); // Debugging line

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

    return res
      .status(200)
      .json({ message: "Login successful", user: userResponse });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// Get User Route
router.get("/api/user", (req, res) => {
  const token = req.cookies.auth_token;
  // console.log("Incoming Cookies:", req.cookies); // Log incoming cookies

  if (!token) {
    console.log("No auth_token cookie found.");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Token verified:", decoded);

    UserModel.findById(decoded.id)
      .select("-password")
      .then((user) => {
        if (!user) {
          console.log("User not found.");
          return res.status(404).json({ message: "User not found" });
        }
        // console.log("Fetched user:", user);
        res.status(200).json({ user });
      })
      .catch((err) => {
        console.error("Error fetching user:", err);
        res.status(500).json({ message: "Internal server error" });
      });
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(401).json({ message: "Invalid token" });
  }
});

// Logout Route
router.post("/api/logout", (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: false, // Set to true in production
    sameSite: "Lax", // Adjust based on environment
  });
  res.status(200).json({ message: "Logout successful" });
});

export default router;
