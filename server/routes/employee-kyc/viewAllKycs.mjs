import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.get("/api/view-all-kycs", async (req, res) => {
  const users = await UserModel.find(
    {},
    "first_name middle_name last_name username email company kyc_approval"
  );
  res.send(users.reverse());
});

export default router;
