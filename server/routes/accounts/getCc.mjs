import express from "express";
import CcModel from "../../model/accounts/creditCardModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-cc", authenticateJWT, async (req, res) => {
  try {
    const data = await CcModel.find({}).exec();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
