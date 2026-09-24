import express from "express";
import UserModel from "../../model/userModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

router.post("/api/unassign-modules", authMiddleware, async (req, res) => {
  try {
    const { modules, username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    const moduleList = Array.isArray(modules) ? modules : (modules ? [modules] : []);
    if (moduleList.length === 0) {
      return res.json({ success: true, message: "No modules provided" });
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { username },
      { $pullAll: { modules: moduleList } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: `Removed ${moduleList.length} module(s) successfully`,
      modules: updatedUser.modules,
    });
  } catch (error) {
    console.error("Error unassigning modules:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to unassign modules" });
  }
});

export default router;
