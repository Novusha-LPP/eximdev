import express from "express";
const router = express.Router();

router.post("/api/logout", (req, res) => {
  // Get the original cookie settings from request to see what we're working with
  console.log("Cookies to clear:", req.cookies);

  // Clear access token
  res.clearCookie("access_token", {
    httpOnly: true,
    //secure: true,
    sameSite: "strict",
    //domain:".alvision.in", // Include the domain if necessary
    path: "/",
  });

  // Clear refresh token
  res.clearCookie("refresh_token", {
    httpOnly: true, // Match the setting used when creating the cookie
    // secure: true,
    // sameSite: "strict",
    // domain:".alvision.in", // Include the domain if necessary
    path: "/",
  });

  console.log("Cookies cleared");
  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;
