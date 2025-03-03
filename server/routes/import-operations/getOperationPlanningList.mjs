import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";

const router = express.Router();
router.get("/api/get-operations-planning-list/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 100, search = "", importer = "" } = req.query;
    const skip = (page - 1) * limit;

    // Validate user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // **Define customHouseCondition based on username**
    let customHouseCondition = {};
    switch (username) {
      case "majhar_khan":
        customHouseCondition = { custom_house: { $in: ["ICD SANAND", "ICD SACHANA"] } };
        break;
      case "parasmal_marvadi":
        customHouseCondition = { custom_house: "AIR CARGO" };
        break;
      case "mahesh_patil":
      case "prakash_darji":
        customHouseCondition = { custom_house: "ICD KHODIYAR" };
        break;
      case "gaurav_singh":
        customHouseCondition = { custom_house: { $in: ["HAZIRA", "BARODA"] } };
        break;
      case "akshay_rajput":
        customHouseCondition = { custom_house: "ICD VARNAMA" };
        break;
      default:
        customHouseCondition = {};
        break;
    }

    // **Build search conditions**
    let searchQuery = [];
    if (search) {
      searchQuery.push({
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { importer: { $regex: search, $options: "i" } },
          { be_no: { $regex: search, $options: "i" } },
          { custom_house: { $regex: search, $options: "i" } },
        ],
      });
    }

    // **Apply importer filter only if it's NOT "Select Importer"**
    if (importer && importer !== "Select Importer") {
      searchQuery.push({ importer: importer });
    }

    // **Combined filter conditions**
    const filterConditions = {
      status: "Pending",
      be_no: { $exists: true, $ne: null, $ne: "", $not: /cancelled/i },
      detailed_status: "BE Noted, Arrival Pending",
      ...customHouseCondition,
    };

    // **Merge search and importer filters properly**
    if (searchQuery.length > 0) {
      filterConditions.$and = searchQuery;
    }

    // **Debugging Log** (Check this in the console to verify the filter)
    

    // **Fetch total count for pagination**
    const totalJobs = await JobModel.countDocuments(filterConditions);

    // **Fetch paginated jobs**
    const jobs = await JobModel.find(filterConditions)
      .select(
        "job_no detailed_status importer status be_no be_date container_nos examination_planning_date custom_house year consignment_type type_of_b_e cth_documents all_documents job_sticker_upload checklist invoice_number invoice_date loading_port no_of_pkgs description gross_weight job_net_weight gateway_igm gateway_igm_date igm_no igm_date awb_bl_no awb_bl_date shipping_line_airline"
      )
      .sort({ examination_planning_date: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // **Check if there are results**
    if (!jobs.length) {
      return res.status(200).send({
        totalJobs: 0,
        totalPages: 0,
        currentPage: parseInt(page, 10),
        jobs: [],
        message: "No matching records found.",
      });
    }

    // **Send the response**
    res.status(200).send({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: parseInt(page, 10),
      jobs,
    });
  } catch (error) {
    console.error("Error fetching operations planning list:", error);
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
});

export default router;
