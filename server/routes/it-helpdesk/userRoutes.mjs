import express from "express";
import mongoose from "mongoose";
import ITHelpdeskUser from "../../model/it-helpdesk/userModel.mjs";
import User from "../../model/userModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

const router = express.Router();
router.use(authMiddleware);

// Validate ObjectId
const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid User ID" });
  }
  next();
};

// CREATE USER
router.post("/", async (req, res) => {
  try {
    const { name, email, role, group, permissions, status } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and Email are required",
      });
    }

    const user = new ITHelpdeskUser({
      name,
      email,
      role,
      group,
      permissions,
      status,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (err) {
    logger.error(`Error creating IT helpdesk user: ${err.message}`);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// GET ALL USERS (Pulls active staff directory from User model + any custom IT users)
router.get("/", async (req, res) => {
  try {
    const { status, q, limit } = req.query;
    const query = {};

    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [
        { username: regex },
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { department: regex },
      ];
    }

    if (status === "inactive") {
      query.isActive = false;
    } else if (status === "all") {
      // return all
    } else {
      // Default: active users
      query.isActive = { $ne: false };
    }

    // Exclude drivers
    query.role = { $nin: ["driver", "Driver"] };

    const limitNum = Math.min(2000, parseInt(limit, 10) || 1000);

    // Fetch primary system users
    const systemUsers = await User.find(query)
      .select("_id username first_name middle_name last_name email department designation employee_code role company isActive")
      .sort({ first_name: 1, username: 1 })
      .limit(limitNum)
      .lean();

    // Map system users to a clean standardized contract
    const formatted = systemUsers.map((u) => {
      const fullName = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ").trim();
      return {
        _id: u._id,
        name: fullName || u.username,
        username: u.username,
        first_name: u.first_name || "",
        last_name: u.last_name || "",
        email: u.email || "",
        department: u.department || "",
        designation: u.designation || "",
        employee_code: u.employee_code || "",
        role: u.role || "Employee",
        company: u.company || "",
        status: u.isActive === false ? "Inactive" : "Active",
      };
    });

    // Also check if any standalone ITHelpdeskUser exist and merge them
    const itUsers = await ITHelpdeskUser.find().lean();
    if (itUsers && itUsers.length > 0) {
      const existingIds = new Set(formatted.map((u) => String(u._id)));
      for (const itu of itUsers) {
        if (!existingIds.has(String(itu._id))) {
          formatted.push({
            _id: itu._id,
            name: itu.name,
            username: itu.email?.split("@")[0] || itu.name,
            email: itu.email || "",
            department: itu.group || "",
            designation: itu.role || "",
            role: itu.role || "Employee",
            status: itu.status || "Active",
          });
        }
      }
    }

    // Sort alphabetically by name
    formatted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    logger.error(`Error fetching IT helpdesk users: ${err.message}`);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// GET SINGLE USER
router.get("/:id", validateId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("_id username first_name middle_name last_name email department designation employee_code role company")
      .lean();

    if (user) {
      const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ").trim();
      return res.json({
        success: true,
        data: {
          ...user,
          name: fullName || user.username,
        },
      });
    }

    const itUser = await ITHelpdeskUser.findById(req.params.id);
    if (!itUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: itUser,
    });
  } catch (err) {
    logger.error(`Error fetching IT helpdesk user: ${err.message}`);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// UPDATE USER
router.put("/:id", validateId, async (req, res) => {
  try {
    const user = await ITHelpdeskUser.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (err) {
    logger.error(`Error updating IT helpdesk user: ${err.message}`);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// DELETE USER
router.delete("/:id", validateId, async (req, res) => {
  try {
    const user = await ITHelpdeskUser.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    logger.error(`Error deleting IT helpdesk user: ${err.message}`);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;