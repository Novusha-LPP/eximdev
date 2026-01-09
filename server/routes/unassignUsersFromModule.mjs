import express from "express";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.post("/api/unassign-users-from-module", async (req, res) => {
  const { moduleName, userIds } = req.body;

  if (!moduleName || !userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  try {
    const result = await UserModel.updateMany(
      { _id: { $in: userIds } },
      { $pull: { modules: moduleName } }
    );

    res.json({
      message: `Removed ${result.modifiedCount} users from module ${moduleName}`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error unassigning users from module:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
