import express from "express";

const router = express.Router();

router.post("/api/logout", (req, res) => {
  res.clearCookie("exim_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Secure only for main production
    sameSite: process.env.NODE_ENV === "server" ? "lax" : "strict", // Lax for testing, strict for production
  });

  res.clearCookie("exim_user", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production", // Secure only for main production
    sameSite: process.env.NODE_ENV === "server" ? "lax" : "strict", // Lax for testing, strict for production
  });

  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;
