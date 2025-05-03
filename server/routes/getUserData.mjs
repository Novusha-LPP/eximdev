import express from "express";
import UserModel from "../model/userModel.mjs";
import { authenticateJWT } from "../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-user-data/:username", authenticateJWT,async (req, res) => {
  const { username } = req.params;

  try {
    const user = await UserModel.findOne({ username }).select("-password");

    if (!user) {
      return res.status(200).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;
