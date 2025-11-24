import express from "express";
import DocumentListModel from "../../model/cthDocumentsModel.mjs";

const router = express.Router();

router.get("/api/get-cth-docs", async (req, res) => {
  const { cth_nos } = req.query; // Get CTH numbers from query parameter
  
  if (!cth_nos) {
    return res.status(400).json({ error: "CTH numbers are required" });
  }

  try {
    // Handle both single string and array of CTH numbers
    const cthArray = Array.isArray(cth_nos) ? cth_nos : cth_nos.split(',');
    
    // Convert to integers and validate
    const validCthNumbers = cthArray
      .map(cth => cth.trim())
      .filter(cth => !isNaN(parseInt(cth, 10)))
      .map(cth => parseInt(cth, 10));

    if (validCthNumbers.length === 0) {
      return res.status(400).json({ error: "No valid CTH numbers provided" });
    }

    // Query database for all CTH numbers
    const data = await DocumentListModel.find({ 
      cth: { $in: validCthNumbers } 
    });

    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching CTH documents:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
