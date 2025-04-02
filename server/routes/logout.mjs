import express from "express";

const router = express.Router();

router.post("/api/logout", (req, res) => {
  res.clearCookie("exim_token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  res.clearCookie("exim_user", {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
  });

  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;
