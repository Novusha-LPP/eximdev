import express from "express";
import PrData from "../../model/srcc/pr.mjs";

const router = express.Router();

router.post("/api/delete-pr", async (req, res) => {
  const { pr_no } = req.body;

  try {
    // Find and delete the document with matching pr_no
    const deletedPrData = await PrData.findOneAndDelete({ pr_no: pr_no });

    // Check if the document was found and deleted successfully
    if (deletedPrData) {
      res.status(200).send({ message: "Document deleted successfully" });
    } else {
      res.status(404).send({ error: "Document not found" });
    }
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;
