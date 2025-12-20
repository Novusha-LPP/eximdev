import express from "express";
import JobModel from "../model/jobModel.mjs";

const router = express.Router();

// GET suppliers/exporters by year + status + detailedStatus
// Example: /api/get-supplier-exporter-list/25-26?status=Completed&detailedStatus=Discharged
router.get("/api/get-supplier-exporter-list/:year", async (req, res) => {
  try {
    const selectedYear = req.params.year;
    const { status, detailedStatus } = req.query;

    // base match: year
    const matchStage = { year: selectedYear };

    // optional status filter (if provided and not "all")
    if (status && status !== "all") {
      matchStage.status = status;
    }

    // optional detailedStatus filter (if provided and not "all")
    if (detailedStatus && detailedStatus !== "all") {
      matchStage.detailed_status = detailedStatus;
    }

    const uniqueSuppliers = await JobModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$supplier_exporter",
        },
      },
      {
        $project: {
          _id: 0,
          supplier_exporter: "$_id",
        },
      },
      { $sort: { supplier_exporter: 1 } },
    ]);

    res.status(200).json(uniqueSuppliers);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while fetching suppliers/exporters.");
  }
});

export default router;
