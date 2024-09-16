import express from "express";
import KycDocumentsModel from "../../model/kycDocumentsModel.mjs";

const router = express.Router();

router.post("/api/get-kyc-documents", async (req, res) => {
  const { importer, shipping_line_airline } = req.body;
  try {
    const data = await KycDocumentsModel.findOne({
      importer,
      shipping_line_airline,
    });
    if (data) {
      res.status(200).json(data);
    } else {
      res.status(200).json({ message: "No data found" });
    }
  } catch (err) {
    console.log(err);
  }
});

export default router;
