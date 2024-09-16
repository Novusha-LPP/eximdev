import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/assign-role", async (req, res) => {
  const { username, role } = req.body;
  const user = await UserModel.findOne({ username });
  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }
  user.role = role;
  user.save();
  res.send({ message: "User role assigned" });
});

export default router;
