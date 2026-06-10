import express from "express";
import mongoose from "mongoose";
import JobModel from "../../model/jobModel.mjs";
import CthModel from "../CthUtil/CthUtil.mjs";

const router = express.Router();

// Helper to escape regex
const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
};

// Dynamic branch resolver from database
const getBranchIdByCodeOrQuery = async (branchQuery) => {
  if (!branchQuery) return null;
  if (mongoose.Types.ObjectId.isValid(branchQuery)) {
    return new mongoose.Types.ObjectId(branchQuery);
  }
  try {
    const branchesCol = mongoose.connection.db.collection("branches");
    const branch = await branchesCol.findOne({
      $or: [
        { branch_code: branchQuery.toUpperCase().trim() },
        { branch_name: new RegExp(`^${branchQuery.trim()}$`, "i") }
      ]
    });
    return branch ? branch._id : null;
  } catch (err) {
    console.error("Error looking up branch in eximdev:", err);
    return null;
  }
};

/**
 * GET /api/container-summary
 */
router.get("/api/container-summary", async (req, res) => {
  try {
    const { year, ie_codes, branchId } = req.query;

    if (!year) {
      return res.status(400).json({ success: false, message: "Year parameter is required" });
    }

    if (!ie_codes) {
      return res.status(400).json({ success: false, message: "IE codes are required" });
    }

    const userIeCodes = ie_codes.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);

    // Resolve branch ID if provided
    let resolvedBranchId = null;
    if (branchId) {
      resolvedBranchId = await getBranchIdByCodeOrQuery(branchId);
    }

    const matchQuery = {
      year,
      ie_code_no: { $in: userIeCodes },
      $or: [
        { bill_no: { $exists: false } },
        { bill_no: null },
        { bill_no: "" },
      ],
    };

    if (resolvedBranchId) {
      matchQuery.branch_id = resolvedBranchId;
    }

    const pipeline = [
      { $match: matchQuery },
      { $unwind: { path: "$container_nos", preserveNullAndEmptyArrays: false } },
      { $match: { "container_nos.size": { $in: ["20", "40"] } } },
      {
        $group: {
          _id: null,
          containers: {
            $push: {
              size: "$container_nos.size",
              arrival_date: "$container_nos.arrival_date",
              emptyContainerOffLoadDate: "$container_nos.emptyContainerOffLoadDate",
            },
          },
        },
      },
    ];

    const result = await JobModel.aggregate(pipeline).allowDiskUse(true);

    let count20Arrived = 0, count40Arrived = 0, count20Transit = 0, count40Transit = 0;

    if (result.length > 0 && result[0].containers) {
      result[0].containers.forEach((c) => {
        const isCompleted = c.emptyContainerOffLoadDate && c.emptyContainerOffLoadDate.trim() !== "";
        if (isCompleted) return;

        const hasArrived = c.arrival_date && c.arrival_date.trim() !== "";

        if (c.size === "20") {
          if (hasArrived) count20Arrived++;
          else count20Transit++;
        } else if (c.size === "40") {
          if (hasArrived) count40Arrived++;
          else count40Transit++;
        }
      });
    }

    const summary = {
      "20_arrived": count20Arrived,
      "40_arrived": count40Arrived,
      "20_transit": count20Transit,
      "40_transit": count40Transit,
      total_arrived: count20Arrived + count40Arrived,
      total_transit: count20Transit + count40Transit,
      grand_total: count20Arrived + count40Arrived + count20Transit + count40Transit,
    };

    res.json({
      success: true,
      summary,
      year_filter: year,
      ie_codes_used: userIeCodes,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Container summary error:", error);
    res.status(500).json({ success: false, message: "Failed to generate container summary.", error: error.message });
  }
});

/**
 * GET /api/container-details
 */
router.get("/api/container-details", async (req, res) => {
  try {
    const { year, status, size, ie_codes, branchId } = req.query;

    if (!year || !status || !ie_codes) {
      return res.status(400).json({ success: false, message: "Missing required parameters (year, status, ie_codes)" });
    }

    const userIeCodes = ie_codes.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);

    // Resolve branch ID if branchId is selected
    let resolvedBranchId = null;
    if (branchId) {
      resolvedBranchId = await getBranchIdByCodeOrQuery(branchId);
    }

    const matchQuery = {
      year,
      ie_code_no: { $in: userIeCodes },
      $or: [
        { bill_no: { $exists: false } },
        { bill_no: null },
        { bill_no: "" },
      ],
    };

    if (resolvedBranchId) {
      matchQuery.branch_id = resolvedBranchId;
    }

    const pipeline = [
      { $match: matchQuery },
      { $unwind: { path: "$container_nos", preserveNullAndEmptyArrays: false } },
      { $match: { "container_nos.size": size ? { $eq: size } : { $in: ["20", "40"] } } },
      {
        $project: {
          job_no: 1,
          job_date: 1,
          importer: 1,
          supplier_exporter: 1,
          awb_bl_no: 1,
          vessel_berthing: 1,
          discharge_date: 1,
          loading_port: 1,
          port_of_reporting: 1,
          shipping_line_airline: 1,
          do_validity_upto_job_level: 1,
          ie_code_no: 1,
          container: {
            container_number: "$container_nos.container_number",
            size: "$container_nos.size",
            arrival_date: "$container_nos.arrival_date",
            delivery_date: "$container_nos.delivery_date",
            emptyContainerOffLoadDate: "$container_nos.emptyContainerOffLoadDate",
            container_rail_out_date: "$container_nos.container_rail_out_date",
            detention_from: "$container_nos.detention_from",
            transporter: "$container_nos.transporter",
            vehicle_no: "$container_nos.vehicle_no",
            delivery_address: "$container_nos.delivery_address",
            delivery_planning: "$container_nos.delivery_planning",
            net_weight_as_per_PL_document: "$container_nos.net_weight_as_per_PL_document",
          },
        },
      },
    ];

    const result = await JobModel.aggregate(pipeline).allowDiskUse(true);

    const filtered = result.filter((item) => {
      const isCompleted = item.container.emptyContainerOffLoadDate && item.container.emptyContainerOffLoadDate.trim() !== "";
      if (isCompleted) return false;

      const hasArrived = item.container.arrival_date && item.container.arrival_date.trim() !== "";
      return status === "arrived" ? hasArrived : !hasArrived;
    });

    const formatted = filtered.map((item) => ({
      job_no: item.job_no,
      job_date: item.job_date,
      importer: item.importer,
      supplier_exporter: item.supplier_exporter,
      awb_bl_no: item.awb_bl_no,
      vessel_berthing: item.vessel_berthing,
      discharge_date: item.discharge_date,
      loading_port: item.loading_port,
      port_of_reporting: item.port_of_reporting,
      shipping_line_airline: item.shipping_line_airline,
      ie_code_no: item.ie_code_no,
      container_number: item.container.container_number,
      container_size: item.container.size,
      arrival_date: item.container.arrival_date,
      delivery_date: item.container.delivery_date,
      emptyContainerOffLoadDate: item.container.emptyContainerOffLoadDate,
      container_rail_out_date: item.container.container_rail_out_date,
      detention_from: item.container.detention_from,
      transporter: item.container.transporter,
      vehicle_no: item.container.vehicle_no,
      delivery_address: item.container.delivery_address,
      delivery_planning: item.container.delivery_planning,
      net_weight_as_per_PL_document: item.container.net_weight_as_per_PL_document,
      container_status: status,
      days_since_arrival: item.container.arrival_date
        ? Math.floor((new Date() - new Date(item.container.arrival_date)) / (1000 * 60 * 60 * 24))
        : null,
    }));

    if (status === "arrived") {
      formatted.sort((a, b) => new Date(b.arrival_date) - new Date(a.arrival_date));
    } else {
      formatted.sort((a, b) => a.job_no.localeCompare(b.job_no));
    }

    res.json({
      success: true,
      data: formatted,
      total_count: formatted.length,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Container details error:", error);
    res.status(500).json({ success: false, message: "Failed to generate container details.", error: error.message });
  }
});

/**
 * GET /api/get-exporters
 */
router.get("/api/get-exporters", async (req, res) => {
  try {
    const { importer, year, status, branch } = req.query;

    if (!importer) {
      return res.status(400).json({ success: false, message: "Importer parameter is required" });
    }

    const matchQuery = {
      importer: { $regex: importer, $options: "i" },
      supplier_exporter: { $exists: true, $ne: null, $ne: "" },
    };

    if (year) {
      matchQuery.year = year;
    }

    let resolvedBranchId = null;
    if (branch) {
      resolvedBranchId = await getBranchIdByCodeOrQuery(branch);
    }

    if (resolvedBranchId) {
      matchQuery.branch_id = resolvedBranchId;
    }

    // Handle status matches if provided
    if (status && status.toLowerCase() !== "all") {
      const statusLower = status.toLowerCase();
      if (statusLower === "pending") {
        matchQuery.status = { $regex: "^pending$", $options: "i" };
      } else if (statusLower === "completed") {
        matchQuery.status = { $regex: "^completed$", $options: "i" };
      } else if (statusLower === "cancelled") {
        matchQuery.status = { $regex: "^cancelled$", $options: "i" };
      }
    }

    const pipeline = [
      { $match: matchQuery },
      { $group: { _id: "$supplier_exporter" } },
      { $project: { _id: 0, exporter: "$_id" } },
      { $sort: { exporter: 1 } },
    ];

    const result = await JobModel.aggregate(pipeline).allowDiskUse(true);
    const exporters = result.map((item) => item.exporter);

    res.json({
      message: "Exporters fetched successfully",
      success: true,
      count: exporters.length,
      exporters,
    });
  } catch (error) {
    console.error("Get exporters error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch exporters." });
  }
});

/**
 * GET /api/get-job-numbers/multiple
 */
router.get("/api/get-job-numbers/multiple", async (req, res) => {
  try {
    const { ieCodes, year, search, branch } = req.query;

    if (!ieCodes) {
      return res.status(400).json({ success: false, message: "ieCodes parameter is required" });
    }

    const ieCodeArray = ieCodes.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);

    const query = { ie_code_no: { $in: ieCodeArray } };
    if (year) query.year = year;
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ job_no: searchRegex }, { supplier_exporter: searchRegex }];
    }

    let resolvedBranchId = null;
    if (branch) {
      resolvedBranchId = await getBranchIdByCodeOrQuery(branch);
    }

    if (resolvedBranchId) {
      query.branch_id = resolvedBranchId;
    }

    const jobs = await JobModel.find(query, {
      job_no: 1,
      year: 1,
      job_date: 1,
      supplier_exporter: 1,
      ie_code_no: 1,
      importer: 1,
    }).sort({ year: -1, job_no: 1 }).lean();

    res.json({
      success: true,
      data: jobs,
      total_count: jobs.length,
    });
  } catch (error) {
    console.error("Get job numbers error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/get-be-numbers/multiple
 */
router.get("/api/get-be-numbers/multiple", async (req, res) => {
  try {
    const { ieCodes, year, search, branch } = req.query;

    if (!ieCodes) {
      return res.status(400).json({ success: false, message: "ieCodes parameter is required" });
    }

    const ieCodeArray = ieCodes.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);

    const query = {
      ie_code_no: { $in: ieCodeArray },
      be_no: { $exists: true, $ne: null, $ne: "" },
    };
    if (year) query.year = year;
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ be_no: searchRegex }, { supplier_exporter: searchRegex }];
    }

    let resolvedBranchId = null;
    if (branch) {
      resolvedBranchId = await getBranchIdByCodeOrQuery(branch);
    }

    if (resolvedBranchId) {
      query.branch_id = resolvedBranchId;
    }

    const jobs = await JobModel.find(query, {
      be_no: 1,
      year: 1,
      job_date: 1,
      supplier_exporter: 1,
      ie_code_no: 1,
      importer: 1,
    }).sort({ year: -1, be_no: 1 }).lean();

    const formatted = jobs.map((j) => ({
      be_no: j.be_no,
      year: j.year,
      job_date: j.job_date,
      supplier_exporter: j.supplier_exporter || "N/A",
      ie_code_no: j.ie_code_no,
      importer: j.importer || "N/A",
    }));

    res.json({
      success: true,
      data: formatted,
      total_count: formatted.length,
    });
  } catch (error) {
    console.error("Get BE numbers error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/lookup/:hsCode/:jobNo/:year
 * GET /api/lookup/:jobNo/:year
 */
router.get(["/api/lookup/:hsCode/:jobNo/:year", "/api/lookup/:jobNo/:year"], async (req, res) => {
  try {
    const { hsCode, jobNo, year } = req.params;
    const userIeCodes = req.query.ie_code_nos;
    const { branch } = req.query;

    if (!userIeCodes) {
      return res.status(400).json({ success: false, message: "IE codes are required" });
    }

    const ieCodeArray = userIeCodes.split(",").map((code) => code.trim()).filter(Boolean);

    const query = {
      $or: [{ job_no: jobNo }, { be_no: jobNo }],
      year,
      ie_code_no: { $in: ieCodeArray },
    };

    let resolvedBranchId = null;
    if (branch) {
      resolvedBranchId = await getBranchIdByCodeOrQuery(branch);
    }

    if (resolvedBranchId) {
      query.branch_id = resolvedBranchId;
    }

    const job = await JobModel.findOne(query).select(
      "cth_no total_duty total_inv_value assbl_value assessable_ammount exrate clearanceValue unit_price awb_bl_date job_net_weight loading_port shipping_line_airline port_of_reporting net_weight_calculator ie_code_no hs_code be_no job_no"
    ).lean();

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found or not authorized." });
    }

    const hsCodeToLookup = job.hs_code || job.cth_no || hsCode;

    const cthEntry = await CthModel.findOne({ hs_code: hsCodeToLookup }).select(
      "hs_code basic_duty_sch basic_duty_ntfn igst sws_10_percent"
    ).lean();

    if (!cthEntry) {
      return res.status(404).json({ success: false, message: "HS Code data not found" });
    }

    let finalAssessableValue = "0.00";
    const assblValue = parseFloat(job.assbl_value) || 0;
    const assessableAmount = parseFloat(job.assessable_ammount) || 0;

    if (assblValue > 0 && assessableAmount > 0) {
      finalAssessableValue = Math.max(assblValue, assessableAmount).toFixed(2);
    } else if (assblValue > 0) {
      finalAssessableValue = assblValue.toFixed(2);
    } else if (assessableAmount > 0) {
      finalAssessableValue = assessableAmount.toFixed(2);
    }

    const result = {
      hs_code: cthEntry.hs_code,
      basic_duty_sch: cthEntry.basic_duty_sch,
      basic_duty_ntfn: cthEntry.basic_duty_ntfn,
      igst: cthEntry.igst,
      sws_10_percent: cthEntry.sws_10_percent,
      job_data: {
        job_no: job.job_no,
        be_no: job.be_no,
        total_duty: job.total_duty,
        total_inv_value: job.total_inv_value,
        assbl_value: job.assbl_value,
        assessable_ammount: job.assessable_ammount,
        final_assessable_value: finalAssessableValue,
        exrate: job.exrate,
        clearanceValue: job.clearanceValue,
        unit_price: job.unit_price,
        awb_bl_date: job.awb_bl_date,
        job_net_weight: job.job_net_weight,
        loading_port: job.loading_port,
        shipping_line_airline: job.shipping_line_airline,
        port_of_reporting: job.port_of_reporting,
        net_weight_calculator: job.net_weight_calculator || {
          duty: "0.00",
          shipping: "0.00",
          custom_clearance_charges: "0.00",
          detention: "0.00",
          cfs: "0.00",
          transport: "0.00",
          Labour: "0.00",
          miscellaneous: "0.00",
          weight: job.job_net_weight || "0.00",
          total_cost: "0.00",
          per_kg_cost: "0.00",
        },
        ie_code_no: job.ie_code_no,
        hs_code: job.hs_code,
      },
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Lookup error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /api/store-calculator-data/:jobNo
 */
router.post("/api/store-calculator-data/:jobNo", async (req, res) => {
  try {
    const { jobNo } = req.params;
    const year = req.query.year;
    const data = req.body;
    const { branch } = req.query;

    if (!jobNo || !year) {
      return res.status(400).json({ success: false, message: "Job number and year are required" });
    }

    const query = {
      $or: [{ job_no: jobNo }, { be_no: jobNo }],
      year,
    };

    let resolvedBranchId = null;
    if (branch) {
      resolvedBranchId = await getBranchIdByCodeOrQuery(branch);
    }

    if (resolvedBranchId) {
      query.branch_id = resolvedBranchId;
    }

    const updatedJob = await JobModel.findOneAndUpdate(
      query,
      { $set: { net_weight_calculator: data } },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({ success: true, message: "Calculator data saved successfully", data: updatedJob });
  } catch (error) {
    console.error("Store calculator data error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * PATCH /api/update-per-kg-cost
 */
router.patch("/api/update-per-kg-cost", async (req, res) => {
  try {
    const { jobNo, perKgCost } = req.body;
    const year = req.query.year;
    const { branch } = req.query;

    if (!jobNo || !year) {
      return res.status(400).json({ success: false, message: "Job number and year are required" });
    }

    const query = {
      $or: [{ job_no: jobNo }, { be_no: jobNo }],
      year,
    };

    let resolvedBranchId = null;
    if (branch) {
      resolvedBranchId = await getBranchIdByCodeOrQuery(branch);
    }

    if (resolvedBranchId) {
      query.branch_id = resolvedBranchId;
    }

    const updatedJob = await JobModel.findOneAndUpdate(
      query,
      { $set: { "net_weight_calculator.per_kg_cost": perKgCost } },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({ success: true, message: "Per kg cost updated successfully", data: updatedJob });
  } catch (error) {
    console.error("Update per kg cost error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * PATCH /api/update-job-duty-weight/:jobNo
 */
router.patch("/api/update-job-duty-weight/:jobNo", async (req, res) => {
  try {
    const { jobNo } = req.params;
    const { totalDuty, jobNetWeight } = req.body;
    const year = req.query.year;
    const { branch } = req.query;

    if (!jobNo || !year) {
      return res.status(400).json({ success: false, message: "Job number and year are required" });
    }

    const query = {
      $or: [{ job_no: jobNo }, { be_no: jobNo }],
      year,
    };

    let resolvedBranchId = null;
    if (branch) {
      resolvedBranchId = await getBranchIdByCodeOrQuery(branch);
    }

    if (resolvedBranchId) {
      query.branch_id = resolvedBranchId;
    }

    const updatedJob = await JobModel.findOneAndUpdate(
      query,
      {
        $set: {
          total_duty: totalDuty,
          job_net_weight: jobNetWeight,
        },
      },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({ success: true, message: "Job duty and weight updated successfully", data: updatedJob });
  } catch (error) {
    console.error("Update job duty/weight error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET /api/get-duties/:job_no
 */
router.get("/api/get-duties/:job_no", async (req, res) => {
  try {
    const jobNo = req.params.job_no;
    if (!jobNo) {
      return res.status(400).json({ message: "Job number is required" });
    }

    const job = await JobModel.findOne({ job_no: jobNo }).select(
      "job_no total_duty job_net_weight net_weight net_weight_calculator"
    ).lean();

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({
      success: true,
      data: {
        job_no: job.job_no,
        total_duty: job.total_duty,
        job_net_weight: job.job_net_weight || 0,
        net_weight: job.net_weight || 0,
        per_kg_cost: job.net_weight_calculator?.per_kg_cost || "0.00",
      },
    });
  } catch (error) {
    console.error("Get duty error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch total duty" });
  }
});

export default router;
