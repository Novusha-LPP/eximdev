import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/assign-modules", async (req, res) => {
  const { modules, username } = req.body;
  const user = await UserModel.findOne({ username });
  user.modules = [...new Set([...user.modules, ...modules])];
  user.save();
  res.send("success");
});

export default router;
