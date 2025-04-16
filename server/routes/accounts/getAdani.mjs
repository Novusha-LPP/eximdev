import express from "express";
import AdaniModel from "../../model/accounts/adaniModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-adani",authenticateJWT, async (req, res) => {
  try {
    const data = await AdaniModel.find({}).exec();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
