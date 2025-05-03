import express from "express";
import UserModel from "../../model/userModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/view-all-kycs",authenticateJWT, async (req, res) => {
  const users = await UserModel.find(
    {},
    "first_name middle_name last_name username email company kyc_approval"
  );
  res.send(users.reverse());
});

export default router;
