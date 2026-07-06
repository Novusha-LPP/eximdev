import express from "express";
import mongoose from "mongoose";
import ITHelpdeskUser from "../../model/it-helpdesk/userModel.mjs";
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

// GET ALL USERS
router.get("/", async (req, res) => {
  try {
    const users = await ITHelpdeskUser.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users,
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
    const user = await ITHelpdeskUser.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
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