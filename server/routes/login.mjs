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
      if (passwordErr) {
        console.error(passwordErr);
        return res.status(500).json({ message: "Something went wrong" });
      }

      if (passwordResult) {
        // Generate JWT token
        const token = generateToken(user);

        // Sanitize user data
        const userResponse = sanitizeUserData(user);



        // Set secure, httpOnly cookies
        res.cookie("exim_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // use HTTPS only in production
          sameSite: "strict", // protect against CSRF
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        // Set user data cookie (without sensitive information)
        res.cookie(
          "exim_user",
          JSON.stringify({
            username: user.username,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
          }),
          {
            httpOnly: false, // this cookie can be read by client-side JS
            secure: process.env.NODE_ENV === "production",
            //sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
          }
        );

        return res.status(200).json(userResponse);
      } else {
        return res
          .status(400)
          .json({ message: "Username or password didn't match" });
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// Logout route to clear cookies

export default router;
