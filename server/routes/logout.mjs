import express from "express";

const router = express.Router();

router.post("/api/logout", async (req, res) => {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    };

    res.clearCookie("token", cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout route error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
});

export default router;
