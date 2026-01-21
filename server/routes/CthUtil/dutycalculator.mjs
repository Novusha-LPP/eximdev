import express from "express";
import mongoose from "mongoose";
import CthModel from "./CthUtil.mjs";
// JobModel is now attached to req by branchJobMiddleware

const router = express.Router();

// Get all CTH entries (with pagination)
router.get("/api/getallcth", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    let query = {};

    // Search functionality
    if (search) {
      query = {
        $or: [
          { hs_code: { $regex: search, $options: "i" } },
          { item_description: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Get total count for pagination
    const total = await CthModel.countDocuments(query);

    // Get CTH entries with pagination
    const cthEntries = await CthModel.find(query)
      .sort({ hs_code: 1 })
      .skip(skip)
      .limit(limit)
      .populate("job", "job_no year total_inv_value assbl_value");

    res.status(200).json({
      success: true,
      data: cthEntries,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching CTH entries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch CTH entries",
      error: error.message,
    });
  }
});

// Look up CTH by HS code or by job number and year
router.get("/api/lookup/:hsCode?/:jobNo/:year", async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    const { hsCode, jobNo, year } = req.params;
    let job, cthEntry, lookupHsCode;

    // If hsCode is provided directly, use it. Otherwise, look it up from the job
    if (hsCode && hsCode !== "undefined") {
      lookupHsCode = hsCode;

      // Find the job matching the criteria
      job = await JobModel.findOne({
        cth_no: lookupHsCode,
        job_no: jobNo,
        year: year,
      }).select(
        "cth_no total_duty total_inv_value assbl_value exrate clearanceValue unit_price awb_bl_date job_net_weight"
      );
    } else {
      // Find the job just by job number and year
      job = await JobModel.findOne({
        job_no: jobNo,
        year: year,
      }).select(
        "cth_no total_duty total_inv_value assbl_value exrate clearanceValue unit_price awb_bl_date job_net_weight"
      );

      if (job) {
        lookupHsCode = job.cth_no;
      } else {
        return res.status(404).json({
          success: false,
          message: "No job found with the specified job number and year",
        });
      }
    }

    // Find the CTH entry that matches the HS code
    cthEntry = await CthModel.findOne({
      hs_code: lookupHsCode,
    }).select("hs_code basic_duty_sch basic_duty_ntfn igst sws_10_percent");

    if (!cthEntry) {
      return res.status(404).json({
        success: false,
        message: "No CTH entry found for the job's HS code",
      });
    }

    // Combine CTH and job data
    const result = {
      hs_code: cthEntry.hs_code,
      basic_duty_sch: cthEntry.basic_duty_sch,
      basic_duty_ntfn: cthEntry.basic_duty_ntfn,
      igst: cthEntry.igst,
      sws_10_percent: cthEntry.sws_10_percent,
      job_data: {
        total_duty: job.total_duty,
        total_inv_value: job.total_inv_value,
        assbl_value: job.assbl_value,
        exrate: job.exrate,
        clearanceValue: job.clearanceValue,
        unit_price: job.unit_price,
        awb_bl_date: job.awb_bl_date,
        job_net_weight: job.job_net_weight,
      },
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error looking up CTH and job data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to lookup CTH and job data",
      error: error.message,
    });
  }
});

export default router;
