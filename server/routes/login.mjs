import express from "express";
import bcrypt from "bcrypt";
import UserModel from "../model/userModel.mjs";
import { generateToken, sanitizeUserData } from "../auth/auth.mjs";

const router = express.Router();

router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not registered" });
    }

    bcrypt.compare(password, user.password, (passwordErr, passwordResult) => {
      console.log(passwordResult);
      try {
        if (passwordErr) {
          console.error(passwordErr);
          return res.status(500).json({ message: "Something went wrong" });
        }

        if (passwordResult) {
          const token = generateToken(user);
          const userResponse = sanitizeUserData(user);
          console.log(token, userResponse);
          res.cookie("exim_token", token, {
            httpOnly: true,
            // secure: process.env.NODE_ENV === "production", // Secure only for main production
            sameSite: process.env.NODE_ENV === "server" ? "lax" : "strict", // Lax for testing, strict for production
            maxAge: 24 * 60 * 60 * 1000,
          });
          res.cookie(
            "exim_user",
            JSON.stringify({
              username: user.username,
              role: user.role,
              first_name: user.first_name,
              last_name: user.last_name,
            }),
            {
              httpOnly: false,
              // secure: process.env.NODE_ENV === "production", // Secure only for main production
              sameSite: process.env.NODE_ENV === "server" ? "lax" : "strict", // Lax for testing, strict for production
              maxAge: 24 * 60 * 60 * 1000,
            }
          );
          return res.status(200).json(userResponse);
        } else {
          return res
            .status(400)
            .json({ message: "Username or password didn't match" });
        }
      } catch (err) {
        console.error("Error in bcrypt callback:", err);
        return res.status(500).json({ message: "Something went wrong" });
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// Logout route to clear cookies

export default router;
