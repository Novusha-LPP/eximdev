import express from "express";

const router = express.Router();

router.post("/api/logout", (req, res) => {
  res.clearCookie("exim_token", {
    httpOnly: true,
    secure: true,
    sameSite: "strict", // Lax for testing, strict for production
  });

  res.clearCookie("exim_user", {
    httpOnly: false,
    secure: true, // use HTTPS only in production
    sameSite: "strict", // Lax for testing, strict for production
  });

  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;
