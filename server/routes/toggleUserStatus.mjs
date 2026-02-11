import express from "express";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.post("/api/toggle-user-status", async (req, res) => {
  const { username, isActive } = req.body;

  if (typeof isActive === "undefined") {
    return res.status(400).json({ message: "isActive status is required" });
  }

  try {
    const updateData = { isActive: isActive };
    if (isActive === false) {
      updateData.deactivatedAt = new Date();
    } else {
      updateData.deactivatedAt = null;
    }

    const user = await UserModel.findOneAndUpdate({ username }, updateData, {
      new: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User status updated", user });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Error updating user status" });
  }
});

export default router;
