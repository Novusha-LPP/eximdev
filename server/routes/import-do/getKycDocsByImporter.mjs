import express from "express";
import KycDocumentsModel from "../../model/kycDocumentsModel.mjs";

const router = express.Router();

router.post("/api/get-kyc-docs-by-importer", async (req, res) => {
  try {
    const { importer } = req.body;
    const data = await KycDocumentsModel.find({ importer });
    if (!data) {
      return res.status(200).json({ message: "Data not found" });
    }
    res.status(200).json(data);
  } catch (err) {
    console.log(err);
  }
});

export default router;
