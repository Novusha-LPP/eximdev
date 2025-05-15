import express from "express";
import AmcModel from "../../model/accounts/amcModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-amc", authenticateJWT, async (req, res) => {
  try {
    const data = await AmcModel.find({}).exec();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
