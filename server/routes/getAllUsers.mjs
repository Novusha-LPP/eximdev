import express from "express";
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

// Validate ObjectId
const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid ID" });
  }
  next();
};

// Create new user (IT Helpdesk)
router.post("/api/users", async (req, res) => {
  try {
    const { username, password, role, department } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password required" });
    }

    const exists = await UserModel.findOne({ username });
    if (exists) {
      return res.status(400).json({ success: false, message: "Username already exists" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = await UserModel.create({
      username,
      password: hashedPassword,
      role: role || "Employee",
      department,
      modules: ["IT Helpdesk"]
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/api/get-all-users", async (req, res) => {
  const { status, q } = req.query;
  const query = {};
  if (q) query.username = { $regex: q, $options: "i" };
  if (status === "inactive") {
    query.isActive = false;
  } else if (status === "active" || !status) {
    query.isActive = { $ne: false };
  }

  // Filter out drivers always, and dev_master in production
  query.role = { $nin: ['driver', 'Driver'] };
  if (process.env.NODE_ENV === 'production') {
    query.username = { $ne: 'dev_master' };
  }

  const users = await UserModel.find(query).select(
    "username role _id first_name last_name isActive deactivatedAt modules isAttendanceAllowedAdmin is_operator department employee_code designation userAssets"
  );

  res.send(users);
});

// Update user IT Helpdesk access (for IT admin)
router.put("/api/users/:id/it-access", validateId, async (req, res) => {
  try {
    const { hasAccess } = req.body;
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let modules = user.modules || [];
    if (hasAccess && !modules.includes("IT Helpdesk")) {
      modules.push("IT Helpdesk");
    } else if (!hasAccess) {
      modules = modules.filter(m => m !== "IT Helpdesk");
    }

    user.modules = modules;
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Deactivate user (for IT admin)
router.delete("/api/users/:id", validateId, async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();
    res.json({ success: true, message: "User deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
    })
    .select(
      "username role _id first_name last_name isActive deactivatedAt modules employee_photo department employee_code mobile branch_id designation company current_status isAttendanceAllowedAdmin is_operator"
    )
    .populate("branch_id", "branch_name branch_code");

    res.send(users);
  } catch (error) {
    console.error("Error fetching users by usernames:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
