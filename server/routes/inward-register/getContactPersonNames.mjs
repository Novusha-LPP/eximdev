import express from "express";
import UserModel from "../../model/userModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-contact-person-names",authenticateJWT, async (req, res) => {
  try {
    const contactPersonNames = await UserModel.find(
      {},
      "first_name middle_name last_name"
    );
    const users = contactPersonNames.map(
      (user) =>
        `${user.first_name} ${
          user.middle_name === undefined ? "" : user.middle_name
        } ${user.last_name}`
    );

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
