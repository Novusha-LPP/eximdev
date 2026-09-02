import express from "express";

const router = express.Router();

router.post("/api/logout", async (req, res) => {
  try {
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production" || process.env.NODE_ENV === "server";

    const cookieOptions = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
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
