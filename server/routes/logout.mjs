import express from "express";

const router = express.Router();

router.post("/api/logout", (req, res) => {
  res.clearCookie("exim_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.clearCookie("exim_user", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;
