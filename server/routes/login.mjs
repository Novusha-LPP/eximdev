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

    // Use bcrypt to compare passwords
    bcrypt.compare(password, user.password, (passwordErr, passwordResult) => {
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
            secure: false,
            sameSite: "Lax", // Lax for testing, strict for production
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
              secure: false, // use HTTPS only in production
              sameSite: "Lax", // Lax for testing, strict for production
              maxAge: 24 * 60 * 60 * 1000,
            }
          );
          return res.status(200).json(userResponse);
        } else {
          return res
            .status(401)
            .json({ message: "Username or password didn't match" });
        }

        // Generate JWT token
        const token = generateToken(user);

        // Sanitize user data
        const userResponse = sanitizeUserData(user);

        // Log what we're sending (for debugging)
        console.log("Token generated:", token);
        console.log("User response:", userResponse);

        // Set secure, httpOnly cookies
        res.cookie("exim_token", token, {
          httpOnly: true,
          secure: false, // use true in production with HTTPS
          sameSite: "Lax", // protect against CSRF
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
            secure:false, // use true in production with HTTPS
            sameSite: "Lax",
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
          }
        );

        return res.status(200).json(userResponse);
      } catch (err) {
        console.error("Error in bcrypt callback:", err);
        return res.status(500).json({ message: "Something went wrong" });
      }
    });
  } catch (err) {
    console.error("Login route error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
