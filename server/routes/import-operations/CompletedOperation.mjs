import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";

const router = express.Router();

router.get("/api/get-completed-operations/:username", async (req, res) => {
  const { username } = req.params;
  const { page = 1, limit = 100, search = "", selectedICD = "" } = req.query;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

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

    // Add selected ICD filter if provided
    if (selectedICD) {
      customHouseCondition = { custom_house: selectedICD };
    }

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { job_no: { $regex: search, $options: "i" } },
            { importer: { $regex: search, $options: "i" } },
            { custom_house: { $regex: search, $options: "i" } },
            { be_no: { $regex: search, $options: "i" } },
            {
              "container_nos.container_number": {
                $regex: search,
                $options: "i",
              },
            },
          ],
        }
      : {};

    const skip = (page - 1) * limit;

    const baseQuery = {
      $and: [
        customHouseCondition,
        {
          completed_operation_date: { $exists: true, $ne: null, $ne: "" },
        },
        searchQuery,
      ],
    };

    // Total jobs count for pagination
    const totalJobs = await JobModel.countDocuments(baseQuery);

    // Fetch jobs with pagination
    const jobs = await JobModel.find(baseQuery)
      .sort({ completed_operation_date: -1 }) // Sort by completed_operation_date descending
      .skip(skip)
      .limit(limit);

    res.status(200).send({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: parseInt(page, 10),
      jobs,
    });
  } catch (error) {
    console.error("Error fetching completed operations:", error);
    res.status(500).send({ message: "Error fetching completed operations" });
  }
});

export default router;
