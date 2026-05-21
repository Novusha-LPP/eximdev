import express from "express";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.get("/api/get-all-users", async (req, res) => {
  const { status } = req.query;

  const query = {};
  if (status === "inactive") {
    query.isActive = false;
  } else if (status === "active" || !status) {
    query.isActive = { $ne: false };
  }

  const users = await UserModel.find(query).select(
    "username role _id first_name last_name isActive deactivatedAt modules"
  );

  res.send(users);
});

// Get users by usernames array (for admin team member lookup)
router.post("/api/get-users-by-usernames", async (req, res) => {
  try {
    const { usernames } = req.body;
    if (!usernames || !Array.isArray(usernames)) {
      return res.status(400).json({ message: "Usernames array is required" });
    }

    const users = await UserModel.find({
      username: { $in: usernames },
      isActive: { $ne: false }
    }).select(
      "username role _id first_name last_name isActive deactivatedAt modules employee_photo department"
    );

    res.send(users);
  } catch (error) {
    console.error("Error fetching users by usernames:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
