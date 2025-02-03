import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";

const router = express.Router();

router.get("/api/get-operations-planning-list/:username", async (req, res) => {
  const { username } = req.params;
  const { page = 1, limit = 100, search = "" } = req.query;
  const skip = (page - 1) * limit;

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }

  // Define customHouseCondition based on username
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

  try {
    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { job_no: { $regex: search, $options: "i" } },
            { importer: { $regex: search, $options: "i" } },
            { be_no: { $regex: search, $options: "i" } },
            { custom_house: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const filterConditions = {
      status: "Pending",
      be_no: { $exists: true, $ne: null, $ne: "", $not: /cancelled/i },
      detailed_status: "BE Noted, Arrival Pending",
      ...customHouseCondition,
      ...searchQuery,
    };

    // Fetch all matching jobs for total count
    const totalJobs = await JobModel.countDocuments(filterConditions);

    // Fetch paginated jobs
    const jobs = await JobModel.find(filterConditions)
      .select(
        "job_no detailed_status importer status be_no be_date container_nos examination_planning_date custom_house year consignment_type type_of_b_e cth_documents all_documents "
      )
      .sort({ examination_planning_date: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).send({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: parseInt(page, 10),
      jobs,
    });
  } catch (error) {
    console.error("Error fetching operations planning list:", error);
    res.status(500).send({ message: "Server error", error });
  }
});

export default router;
