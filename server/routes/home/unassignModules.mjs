import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/unassign-modules", async (req, res) => {
  const { modules, username } = req.body;

  const user = await UserModel.findOne({ username });
  user.modules = user.modules.filter((module) => !modules.includes(module));
  user.save();
  res.send("success");
});

export default router;
