import express from "express";
import UserModel from "../model/userModel.mjs";
import { authenticateJWT } from "../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-all-users", authenticateJWT, async (req, res) => {
  const users = await UserModel.find({});
  res.send(users);
});

export default router;
