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

// ---------------- DASHBOARD & OTHER ANALYTICS MIGRATION ----------------

const getOverviewPipeline = (startDateStr, endDateStr, importer) => {
  const sevenDaysAgoStr = startDateStr;
  const todayStr = endDateStr;

  let importerList = [];
  if (Array.isArray(importer)) {
    importerList = importer;
  } else if (typeof importer === "string" && importer) {
    importerList = importer.split(",");
  }

  const importerMatch = importerList.length > 0
    ? { importer: { $in: importerList } }
    : {};

  return [
    {
      $facet: {
        jobs_created_today: [
          {
            $match: {
              job_date: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$job_date",
            },
          },
        ],
        operations_completed: [
          {
            $match: {
              completed_operation_date: {
                $gte: startDateStr,
                $lte: endDateStr,
              },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$completed_operation_date",
            },
          },
        ],
        examination_planning: [
          {
            $match: {
              examination_planning_date: {
                $gte: startDateStr,
                $lte: endDateStr,
              },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$examination_planning_date",
            },
          },
        ],
        jobs_trend: [
          {
            $match: {
              job_date: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$job_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        ops_trend: [
          {
            $match: {
              completed_operation_date: {
                $gte: sevenDaysAgoStr,
                $lte: todayStr,
              },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$completed_operation_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        exam_trend: [
          {
            $match: {
              examination_planning_date: {
                $gte: sevenDaysAgoStr,
                $lte: todayStr,
              },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$examination_planning_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        arrival_trend: [
          { $match: { ...importerMatch } },
          { $unwind: "$container_nos" },
          {
            $match: {
              "container_nos.arrival_date": {
                $gte: sevenDaysAgoStr,
                $lte: todayStr,
              },
            },
          },
          {
            $group: {
              _id: { $substr: ["$container_nos.arrival_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        rail_out_trend: [
          { $match: { ...importerMatch } },
          { $unwind: "$container_nos" },
          {
            $match: {
              "container_nos.container_rail_out_date": {
                $gte: sevenDaysAgoStr,
                $lte: todayStr,
              },
            },
          },
          {
            $group: {
              _id: {
                $substr: ["$container_nos.container_rail_out_date", 0, 10],
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        be_trend: [
          {
            $match: {
              be_date: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$be_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        ooc_trend: [
          {
            $match: {
              out_of_charge: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$out_of_charge", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        do_trend: [
          {
            $match: {
              do_completed: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$do_completed", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        billing_trend: [
          {
            $match: {
              bill_document_sent_to_accounts: {
                $gte: sevenDaysAgoStr,
                $lte: todayStr,
              },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$bill_document_sent_to_accounts", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        eta_trend: [
          {
            $match: {
              vessel_berthing: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$vessel_berthing", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        gateway_igm_trend: [
          {
            $match: {
              gateway_igm_date: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$gateway_igm_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        discharge_trend: [
          {
            $match: {
              discharge_date: { $gte: sevenDaysAgoStr, $lte: todayStr },
              ...importerMatch,
            },
          },
          {
            $group: {
              _id: { $substr: ["$discharge_date", 0, 10] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        arrivals_today: [
          { $match: { ...importerMatch } },
          { $unwind: "$container_nos" },
          {
            $match: {
              "container_nos.arrival_date": {
                $gte: startDateStr,
                $lte: endDateStr,
              },
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$container_nos.arrival_date",
              container_number: "$container_nos.container_number",
            },
          },
        ],
        rail_out_today: [
          { $match: { ...importerMatch } },
          { $unwind: "$container_nos" },
          {
            $match: {
              "container_nos.container_rail_out_date": {
                $gte: startDateStr,
                $lte: endDateStr,
              },
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$container_nos.container_rail_out_date",
              container_number: "$container_nos.container_number",
            },
          },
        ],
        be_filed: [
          {
            $match: {
              be_date: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$be_date",
              processed_be_attachment: 1,
            },
          },
        ],
        ooc: [
          {
            $match: {
              out_of_charge: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$out_of_charge",
              ooc_copies: 1,
            },
          },
        ],
        do_completed: [
          {
            $match: {
              do_completed: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$do_completed",
            },
          },
        ],
        billing_sent: [
          {
            $match: {
              bill_document_sent_to_accounts: {
                $gte: startDateStr,
                $lte: endDateStr,
              },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$bill_document_sent_to_accounts",
            },
          },
        ],
        eta: [
          {
            $match: {
              vessel_berthing: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$vessel_berthing",
            },
          },
        ],
        gateway_igm_date: [
          {
            $match: {
              gateway_igm_date: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$gateway_igm_date",
            },
          },
        ],
        discharge_date: [
          {
            $match: {
              discharge_date: { $gte: startDateStr, $lte: endDateStr },
              ...importerMatch,
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$discharge_date",
            },
          },
        ],
        empty_offload: [
          { $match: { ...importerMatch } },
          { $unwind: "$container_nos" },
          {
            $match: {
              "container_nos.emptyContainerOffLoadDate": {
                $gte: startDateStr,
                $lte: endDateStr,
              },
            },
          },
          {
            $project: {
              job_no: 1,
              importer: 1,
              shipping_line_airline: 1,
              relevant_date: "$container_nos.emptyContainerOffLoadDate",
              container_number: "$container_nos.container_number",
            },
          },
        ],
      },
    },
    {
      $project: {
        summary: {
          jobs_created_today: { $size: "$jobs_created_today" },
          operations_completed: { $size: "$operations_completed" },
          examination_planning: { $size: "$examination_planning" },
          arrivals_today: { $size: "$arrivals_today" },
          rail_out_today: { $size: "$rail_out_today" },
          be_filed: { $size: "$be_filed" },
          ooc: { $size: "$ooc" },
          do_completed: { $size: "$do_completed" },
          billing_sent: { $size: "$billing_sent" },
          eta: { $size: "$eta" },
          gateway_igm_date: { $size: "$gateway_igm_date" },
          discharge_date: { $size: "$discharge_date" },
          empty_offload: { $size: "$empty_offload" },
        },
        details: {
          jobs_created_today: "$jobs_created_today",
          jobs_trend: "$jobs_trend",
          ops_trend: "$ops_trend",
          exam_trend: "$exam_trend",
          arrival_trend: "$arrival_trend",
          rail_out_trend: "$rail_out_trend",
          be_trend: "$be_trend",
          ooc_trend: "$ooc_trend",
          do_trend: "$do_trend",
          billing_trend: "$billing_trend",
          eta_trend: "$eta_trend",
          gateway_igm_trend: "$gateway_igm_trend",
          discharge_trend: "$discharge_trend",
          operations_completed: "$operations_completed",
          examination_planning: "$examination_planning",
          arrivals_today: "$arrivals_today",
          rail_out_today: "$rail_out_today",
          be_filed: "$be_filed",
          ooc: "$ooc",
          do_completed: "$do_completed",
          billing_sent: "$billing_sent",
          eta: "$eta",
          gateway_igm_date: "$gateway_igm_date",
          discharge_date: "$discharge_date",
          empty_offload: "$empty_offload",
        },
      },
    },
  ];
};

router.get("/api/user-dashboard-stats", async (req, res) => {
  try {
    const { importer, date, startDate, endDate } = req.query;
    let startStr, endStr;

    if (startDate && endDate) {
      startStr = startDate;
      endStr = `${endDate}T23:59:59`;
    } else {
      let singleDate = date;
      if (!singleDate) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        singleDate = `${year}-${month}-${day}`;
      }
      startStr = singleDate;
      endStr = `${singleDate}T23:59:59`;
    }

    let targetImporters = null;
    if (importer) {
      targetImporters = importer.split(",");
    }

    const pipeline = getOverviewPipeline(startStr, endStr, targetImporters);
    const result = await JobModel.aggregate(pipeline);
    const stats = result[0] || { summary: {}, details: {} };
    res.json(stats);
  } catch (error) {
    console.error("Error fetching user dashboard stats:", error);
    res.status(500).json({ error: "Error fetching user dashboard stats" });
  }
});

router.get("/api/analytics/get-jobs-overview/:year", async (req, res) => {
  try {
    const { year } = req.params;
    const { status, search, importer, branch, branchId } = req.query;
    const statusLower = status ? status.toLowerCase() : null;

    const matchQuery = { $and: [{ year }] };

    let targetImporters = null;
    if (importer) {
      targetImporters = importer.split(",");
    }
    if (targetImporters && targetImporters.length > 0) {
      matchQuery.$and.push({ importer: { $in: targetImporters } });
    }

    const targetBranch = branchId || branch;
    if (targetBranch) {
      const resolvedBranchId = await getBranchIdByCodeOrQuery(targetBranch);
      if (resolvedBranchId) {
        matchQuery.$and.push({ branch_id: resolvedBranchId });
      }
    }

    if (statusLower === "pending") {
      matchQuery.$and.push(
        { status: { $regex: "^pending$", $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        {
          $or: [
            { bill_date: { $in: [null, ""] } },
            { status: { $regex: "^pending$", $options: "i" } },
          ],
        }
      );
    } else if (statusLower === "completed") {
      matchQuery.$and.push(
        { status: { $regex: "^completed$", $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        {
          $or: [
            { bill_date: { $nin: [null, ""] } },
            { status: { $regex: "^completed$", $options: "i" } },
          ],
        }
      );
    } else if (statusLower === "cancelled") {
      matchQuery.$and.push({
        $or: [
          { status: { $regex: "^cancelled$", $options: "i" } },
          { be_no: { $regex: "^cancelled$", $options: "i" } },
        ],
      });
    }

    if (search) {
      const cleanSearch = String(search).trim();
      matchQuery.$and.push({
        $or: [
          { status: { $regex: escapeRegex(cleanSearch), $options: "i" } },
          { be_no: { $regex: escapeRegex(cleanSearch), $options: "i" } },
          { bill_date: { $regex: escapeRegex(cleanSearch), $options: "i" } },
        ],
      });
    }

    const jobCounts = await JobModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          pendingJobs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: [{ $toLower: "$status" }, "pending"] },
                    { $ne: [{ $toLower: "$be_no" }, "cancelled"] },
                    {
                      $or: [
                        { $eq: ["$bill_date", null] },
                        { $eq: ["$bill_date", ""] },
                        { $eq: [{ $toLower: "$status" }, "pending"] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          completedJobs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: [{ $toLower: "$status" }, "completed"] },
                    { $ne: [{ $toLower: "$be_no" }, "cancelled"] },
                    {
                      $or: [
                        { $ne: ["$bill_date", null] },
                        { $ne: ["$bill_date", ""] },
                        { $eq: [{ $toLower: "$status" }, "completed"] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          cancelledJobs: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: [{ $toLower: "$status" }, "cancelled"] },
                    { $eq: [{ $toLower: "$be_no" }, "cancelled"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalJobs: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          pendingJobs: 1,
          completedJobs: 1,
          cancelledJobs: 1,
          totalJobs: 1,
        },
      },
    ]);

    const responseObj = jobCounts[0] || {
      pendingJobs: 0,
      completedJobs: 0,
      cancelledJobs: 0,
      totalJobs: 0,
    };

    res.json(responseObj);
  } catch (error) {
    console.error("Error fetching job counts:", error);
    res.status(500).json({ error: "Error fetching job counts" });
  }
});

router.get("/api/optimized/:year/jobs/:ieCode/:status", async (req, res) => {
  try {
    const { year, ieCode, status: statusParam } = req.params;
    const { page = 1, limit = 50, search = "" } = req.query;
    const status = statusParam || "all";

    if (!ieCode || !year) {
      return res.status(400).json({ success: false, message: "IE code and year are required" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let aggregationPipeline = [];

    const baseQuery = { year };
    if (ieCode.includes(",")) {
      baseQuery.ie_code_no = { $in: ieCode.split(",") };
    } else {
      baseQuery.ie_code_no = ieCode;
    }

    if (status === "all") {
      baseQuery.$and = [
        {
          $and: [
            { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
            { status: { $not: { $regex: "^cancelled$", $options: "i" } } }
          ]
        }
      ];
    } else {
      const statusLower = status.toLowerCase();
      if (statusLower === "pending") {
        baseQuery.status = { $regex: "^pending$", $options: "i" };
        baseQuery.be_no = { $not: { $regex: "^cancelled$", $options: "i" } };
      } else if (statusLower === "completed") {
        baseQuery.status = { $regex: "^completed$", $options: "i" };
        baseQuery.be_no = { $not: { $regex: "^cancelled$", $options: "i" } };
      } else if (statusLower === "cancelled") {
        baseQuery.$or = [
          { status: { $regex: "^cancelled$", $options: "i" } },
          { be_no: { $regex: "^cancelled$", $options: "i" } }
        ];
      }
    }

    aggregationPipeline.push({ $match: baseQuery });

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      aggregationPipeline.push({
        $match: {
          $or: [
            { job_no: searchRegex },
            { supplier_exporter: searchRegex },
            { importer: searchRegex },
            { custom_house: searchRegex },
            { awb_bl_no: searchRegex },
            { origin_country: searchRegex },
            { description: searchRegex }
          ]
        }
      });
    }

    aggregationPipeline.push({
      $project: {
        job_no: 1,
        year: 1,
        ie_code_no: 1,
        importer: 1,
        custom_house: 1,
        awb_bl_no: 1,
        origin_country: 1,
        supplier_exporter: 1,
        vessel_berthing: 1,
        gateway_igm_date: 1,
        discharge_date: 1,
        be_no: 1,
        be_date: 1,
        loading_port: 1,
        port_of_reporting: 1,
        type_of_b_e: 1,
        consignment_type: 1,
        shipping_line_airline: 1,
        job_net_weight: 1,
        gross_weight: 1,
        per_kg_cost: 1,
        description: 1,
        status: 1,
        detailed_status: 1,
        payment_method: 1,
        "net_weight_calculator.duty": 1,
        "net_weight_calculator.shipping": 1,
        "net_weight_calculator.custom_clearance_charges": 1,
        "net_weight_calculator.detention": 1,
        "net_weight_calculator.cfs": 1,
        "net_weight_calculator.transport": 1,
        "net_weight_calculator.Labour": 1,
        "net_weight_calculator.total_cost": 1,
        "container_nos.container_no": 1
      }
    });

    const countPipeline = [...aggregationPipeline, { $count: "total" }];
    aggregationPipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const [jobsResult, countResult] = await Promise.all([
      JobModel.aggregate(aggregationPipeline),
      JobModel.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: jobsResult,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching jobs by IE code:", error);
    res.status(500).json({ success: false, message: "Failed to fetch job data", error: error.message });
  }
});

router.get("/api/optimized/:year/jobs/:ieCode/all", async (req, res) => {
  try {
    const { year, ieCode } = req.params;
    const { page = 1, limit = 50, search = "" } = req.query;

    if (!ieCode || !year) {
      return res.status(400).json({ success: false, message: "IE code and year are required" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let aggregationPipeline = [
      {
        $match: {
          year,
          ie_code_no: ieCode,
          be_no: { $not: { $regex: "^cancelled$", $options: "i" } },
          status: { $not: { $regex: "^cancelled$", $options: "i" } }
        }
      }
    ];

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      aggregationPipeline.push({
        $match: {
          $or: [
            { job_no: searchRegex },
            { supplier_exporter: searchRegex },
            { importer: searchRegex },
            { custom_house: searchRegex },
            { awb_bl_no: searchRegex },
            { origin_country: searchRegex },
            { description: searchRegex }
          ]
        }
      });
    }

    aggregationPipeline.push({
      $project: {
        job_no: 1,
        year: 1,
        ie_code_no: 1,
        importer: 1,
        custom_house: 1,
        awb_bl_no: 1,
        origin_country: 1,
        supplier_exporter: 1,
        vessel_berthing: 1,
        gateway_igm_date: 1,
        discharge_date: 1,
        be_no: 1,
        be_date: 1,
        loading_port: 1,
        port_of_reporting: 1,
        type_of_b_e: 1,
        consignment_type: 1,
        shipping_line_airline: 1,
        job_net_weight: 1,
        gross_weight: 1,
        per_kg_cost: 1,
        description: 1,
        status: 1,
        detailed_status: 1,
        payment_method: 1,
        "net_weight_calculator.duty": 1,
        "net_weight_calculator.shipping": 1,
        "net_weight_calculator.custom_clearance_charges": 1,
        "net_weight_calculator.detention": 1,
        "net_weight_calculator.cfs": 1,
        "net_weight_calculator.transport": 1,
        "net_weight_calculator.Labour": 1,
        "net_weight_calculator.total_cost": 1,
        "container_nos.container_no": 1
      }
    });

    const countPipeline = [...aggregationPipeline, { $count: "total" }];
    aggregationPipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const [jobsResult, countResult] = await Promise.all([
      JobModel.aggregate(aggregationPipeline),
      JobModel.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: jobsResult,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching multi-status jobs:", error);
    res.status(500).json({ success: false, message: "Failed to fetch job data", error: error.message });
  }
});

router.get("/api/get-hs-codes", async (req, res) => {
  try {
    const { importer, year, status } = req.query;
    if (!importer) {
      return res.status(400).json({ success: false, message: "Importer parameter is required" });
    }

    const matchQuery = {
      importer: { $regex: `^${escapeRegex(importer)}$`, $options: "i" },
    };
    if (year && year !== "all") {
      matchQuery.year = year;
    }

    if (status && status !== "all") {
      const statusLower = status.toLowerCase();
      if (statusLower === "pending") {
        matchQuery.$and = [
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
          {
            $and: [
              { bill_date: { $in: [null, ""] } },
              { status: { $not: { $regex: "^completed$", $options: "i" } } },
            ],
          },
        ];
      } else if (statusLower === "completed") {
        matchQuery.$and = [
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
          {
            $or: [
              { bill_date: { $nin: [null, ""] } },
              { status: { $regex: "^completed$", $options: "i" } },
            ],
          },
        ];
      } else if (statusLower === "cancelled") {
        matchQuery.$and = [
          {
            $or: [
              { status: { $regex: "^cancelled$", $options: "i" } },
              { be_no: { $regex: "^cancelled$", $options: "i" } },
            ],
          },
        ];
      }
    }

    const hsCodes = await JobModel.distinct("cth_no", matchQuery);
    const filteredHsCodes = hsCodes.filter(
      (hsCode) => hsCode && hsCode.trim() !== ""
    );
    res.json(filteredHsCodes);
  } catch (error) {
    console.error("Error fetching HS codes:", error);
    res.status(500).json({ success: false, message: "Failed to fetch HS codes", error: error.message });
  }
});

router.get("/api/get-suppliers", async (req, res) => {
  try {
    const { importer, year, status } = req.query;
    if (!importer) {
      return res.status(400).json({ success: false, message: "Importer parameter is required" });
    }

    const matchQuery = {
      importer: { $regex: `^${escapeRegex(importer)}$`, $options: "i" },
    };
    if (year && year !== "all") {
      matchQuery.year = year;
    }

    if (status && status !== "all") {
      const statusLower = status.toLowerCase();
      if (statusLower === "pending") {
        matchQuery.$and = [
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
          {
            $and: [
              { bill_date: { $in: [null, ""] } },
              { status: { $not: { $regex: "^completed$", $options: "i" } } },
            ],
          },
        ];
      } else if (statusLower === "completed") {
        matchQuery.$and = [
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
          {
            $or: [
              { bill_date: { $nin: [null, ""] } },
              { status: { $regex: "^completed$", $options: "i" } },
            ],
          },
        ];
      } else if (statusLower === "cancelled") {
        matchQuery.$and = [
          {
            $or: [
              { status: { $regex: "^cancelled$", $options: "i" } },
              { be_no: { $regex: "^cancelled$", $options: "i" } },
            ],
          },
        ];
      }
    }

    const suppliers = await JobModel.distinct("supplier_exporter", matchQuery);
    const filteredSuppliers = suppliers.filter(
      (supplier) => supplier && supplier.trim() !== ""
    );
    res.json(filteredSuppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ success: false, message: "Failed to fetch suppliers", error: error.message });
  }
});

export default router;
