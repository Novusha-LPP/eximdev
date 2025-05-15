import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();
router.get("/api/get-operations-planning-list/:username",authenticateJWT, async (req, res) => {
  try {
    const { username } = req.params;
    const {
      page = 1,
      limit = 100,
      search = "",
      importer = "",
      selectedICD,
      year,
    } = req.query;
    const skip = (page - 1) * limit;

    // ✅ Validate user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // ✅ Define customHouseCondition based on username
    let customHouseCondition = {};
    switch (username) {
      case "majhar_khan":
        customHouseCondition = {
          custom_house: { $in: ["ICD SANAND", "ICD SACHANA"] },
        };
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

    // ✅ Apply Selected ICD Filter
    if (selectedICD && selectedICD !== "Select ICD") {
      customHouseCondition = {
        custom_house: new RegExp(`^${selectedICD}$`, "i"),
      };
    }

    // ✅ Apply Importer Filter if provided
    let importerCondition = {};
    if (importer && importer !== "Select Importer") {
      importerCondition = { importer: new RegExp(`^${importer}$`, "i") };
    }

    // ✅ Apply Year Filter if provided
    let yearCondition = {};
    if (year) {
      yearCondition = { year: year };
    }

    // ✅ Build Search Query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { importer: { $regex: search, $options: "i" } },
          { be_no: { $regex: search, $options: "i" } },
          { custom_house: { $regex: search, $options: "i" } },
          {
            "container_nos.container_number": { $regex: search, $options: "i" },
          },
        ],
      };
    }

    // ✅ Build Final Query
    const filterConditions = {
      $and: [
        customHouseCondition, // ✅ Custom House Condition
        importerCondition, // ✅ Importer Filter
        yearCondition, // ✅ Year Filter
        searchQuery, // ✅ Search Query
        {
          status: "Pending",
          be_no: { $exists: true, $ne: null, $ne: "", $not: /cancelled/i },
          be_date: { $nin: [null, ""] },
          detailed_status: "BE Noted, Arrival Pending",
        },
      ],
    };

    // ✅ Fetch Total Count for Pagination
    const totalJobs = await JobModel.countDocuments(filterConditions);

    // ✅ Fetch Paginated Jobs
    const jobs = await JobModel.find(filterConditions)
      .select(
        "job_no detailed_status importer status be_no be_date container_nos examination_planning_date custom_house year consignment_type type_of_b_e cth_documents all_documents job_sticker_upload checklist invoice_number invoice_date loading_port no_of_pkgs description gross_weight job_net_weight gateway_igm gateway_igm_date igm_no igm_date awb_bl_no awb_bl_date concor_invoice_and_receipt_copy shipping_line_airline"
      )
      .sort({ examination_planning_date: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ✅ Check if there are results
    if (!jobs.length) {
      return res.status(200).send({
        totalJobs: 0,
        totalPages: 0,
        currentPage: parseInt(page, 10),
        jobs: [],
        message: "No matching records found.",
      });
    }

    // ✅ Send the response
    res.status(200).send({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: parseInt(page, 10),
      jobs,
    });
  } catch (error) {
    console.error("Error fetching operations planning list:", error);
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
});

export default router;
