import express from "express";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.get("/api/get-all-users", async (req, res) => {
  // const users = await UserModel.f  ind({});
    const users = await UserModel.find({}).select('username role _id');

  res.send(users);
});

export default router;
