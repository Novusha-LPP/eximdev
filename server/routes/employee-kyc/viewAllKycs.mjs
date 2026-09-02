import express from "express";
import UserModel from "../../model/userModel.mjs";
import verifyToken from "../../middleware/authMiddleware.mjs";
import requireRole from "../../middleware/requireRole.mjs";

const router = express.Router();

router.get("/api/view-all-kycs", verifyToken, requireRole("Admin"), async (req, res) => {
  const users = await UserModel.find(
    { isActive: { $ne: false } },
    "first_name middle_name last_name username email company kyc_approval"
  );
  res.send(users.reverse());
});

export default router;
