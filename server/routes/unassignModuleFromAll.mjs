import express from "express";
import UserModel from "../model/userModel.mjs";
import auditMiddleware from "../middleware/auditTrail.mjs";
import authMiddleware from "../middleware/authMiddleware.mjs";

const router = express.Router();

router.post("/api/unassign-module-from-all", authMiddleware, auditMiddleware("User"), async (req, res) => {
  const { moduleName } = req.body;

  if (!moduleName || typeof moduleName !== "string") {
    return res.status(400).json({ message: "Invalid module name" });
  }

  try {
    const result = await UserModel.updateMany(
      {},
      { $pull: { modules: moduleName } }
    );

    res.json({
      message: `Removed module ${moduleName} from ${result.modifiedCount} users`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error unassigning module from all users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
