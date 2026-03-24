import express from "express";
import JobModel from "../../model/jobModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

router.post("/api/jobs/check-duplicate", authMiddleware, async (req, res) => {
  try {
    const { blNumber } = req.body;

    if (!blNumber) {
      return res.status(400).json({ success: false, message: "BL Number is required" });
    }

    // Search for duplicate job across ALL branches and modes (GLOBAL)
    const existingJob = await JobModel.findOne({
      $or: [
        { awb_bl_no: blNumber },
        { hawb_hbl_no: blNumber },
      ]
    }).lean();

    if (existingJob) {
      return res.json({
        success: true,
        exists: true,
        job: existingJob
      });
    }

    return res.json({
      success: true,
      exists: false
    });

  } catch (error) {
    console.error("Error checking duplicate job:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
