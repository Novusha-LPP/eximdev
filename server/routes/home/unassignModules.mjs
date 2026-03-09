import express from "express";
import UserModel from "../../model/userModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

router.post("/api/unassign-modules", authMiddleware, async (req, res) => {
  const { modules, username } = req.body;
  const user = await UserModel.findOne({ username });
  if (!user) return res.status(404).json({ message: "User not found" });
  user.modules = user.modules.filter((module) => !modules.includes(module));
  await user.save();
  res.json({ message: "success" });
});

export default router;
