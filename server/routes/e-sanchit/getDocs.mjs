import express from "express";
import documentsModel from "../../model/documentsModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-docs/",authenticateJWT, async (req, res) => {
  try {
    const data = await documentsModel.find({}).sort({ document_name: 1 });
    if (!data || data.length === 0) {
      return res.status(200).send("Data not found");
    }
    res.status(200).json(data);
  } catch (err) {
    console.error("Error retrieving documents:", err);
    res.status(500).send("Server error");
  }
});

export default router;
