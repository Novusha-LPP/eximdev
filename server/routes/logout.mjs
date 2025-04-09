import express from "express";

const router = express.Router();

router.post("/api/logout", (req, res) => {
  res.clearCookie("exim_token", {
    httpOnly: true,
    secure: false,
    sameSite: "Lax", // Lax for testing, strict for production
  });

  res.clearCookie("exim_user", {
    httpOnly: false,
    secure: false, // use HTTPS only in production
    sameSite: "Lax", // Lax for testing, strict for production
  });

  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;
