import express from "express";
const router = express.Router();

// router.post("/api/logout", (req, res) => {
//   // Get the original cookie settings from request to see what we're working with
//   console.log("Cookies to clear:", req.cookies);

//   // Clear access token
//   res.clearCookie("access_token", {
//     httpOnly: true,
//     //secure: true,
//     sameSite: "strict",
//     //domain:".alvision.in", // Include the domain if necessary
//     path: "/",
//   });

//   // Clear refresh token
//   res.clearCookie("refresh_token", {
//     httpOnly: true, // Match the setting used when creating the cookie
//     // secure: true,
//     // sameSite: "strict",
//     // domain:".alvision.in", // Include the domain if necessary
//     path: "/",
//   });

//   console.log("Cookies cleared");
//   return res.status(200).json({ message: "Logged out successfully" });
// });
router.post("/api/logout", (req, res) => {
  try {
    // No need to clear cookies if you're using localStorage
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
