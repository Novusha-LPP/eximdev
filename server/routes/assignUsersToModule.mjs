import express from "express";
import UserModel from "../model/userModel.mjs";
import auditMiddleware from "../middleware/auditTrail.mjs";
import authMiddleware from "../middleware/authMiddleware.mjs";

const router = express.Router();

router.post("/api/assign-users-to-module", authMiddleware, auditMiddleware("User"), async (req, res) => {
  const { moduleName, userIds } = req.body;

  if (!moduleName || !userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  try {
    const result = await UserModel.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { modules: moduleName } }
    );

    res.json({
      message: `Assigned ${result.modifiedCount} users to module ${moduleName}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error assigning users to module:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
