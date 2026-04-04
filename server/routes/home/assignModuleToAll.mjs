import express from "express";
import UserModel from "../../model/userModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

router.post("/api/assign-module-to-all", authMiddleware, async (req, res) => {
  const { moduleName } = req.body;

  if (!moduleName || typeof moduleName !== "string") {
    return res.status(400).json({ message: "Invalid module name" });
  }

  try {
    const result = await UserModel.updateMany(
      {},
      { $addToSet: { modules: moduleName } }
    );

    res.json({
      message: `Assigned module ${moduleName} to ${result.modifiedCount} users`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error assigning module to all users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
