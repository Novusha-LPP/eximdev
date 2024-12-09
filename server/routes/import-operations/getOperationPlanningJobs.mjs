import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";

const router = express.Router();

// Function to build the search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } }, // Case-insensitive
    { custom_house: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
    { "container_nos.detention_from": { $regex: search, $options: "i" } },
    { be_no: { $regex: search, $options: "i" } },
    { detailed_status: { $regex: search, $options: "i" } },
  ],
});

router.get("/api/get-operations-planning-jobs/:username", async (req, res) => {
  const { username } = req.params;
  const { page = 1, limit = 100, search = "" } = req.query; // Pagination and search params

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Define the custom house condition based on username
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
        customHouseCondition = {}; // No filter for other users
        break;
    }

    const skip = (page - 1) * limit; // Calculate items to skip for pagination
    const searchQuery = search ? buildSearchQuery(search) : {}; // Build search query

    const baseQuery = {
      $and: [
        customHouseCondition, // Apply custom house filter
        {
          status: "Pending",
          be_no: { $exists: true, $ne: null, $ne: "", $not: /cancelled/i },
          "container_nos.arrival_date": { $exists: true, $ne: null, $ne: "" },
          $or: [
            { completed_operation_date: { $exists: false } },
            { completed_operation_date: "" },
          ],
        },
        searchQuery, // Add search query
      ],
    };

    const jobs = await JobModel.find(baseQuery)
      .sort({ examination_planning_date: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalJobs = await JobModel.countDocuments(baseQuery); // Total jobs count for pagination

    // Add row color based on conditions
    const jobsWithColors = jobs.map((job) => {
      const { out_of_charge, examination_planning_date, be_no, container_nos } =
        job;

      const anyContainerArrivalDate = container_nos?.some(
        (container) => container.arrival_date
      );

      let row_color = ""; // Default: no color
      if (out_of_charge) {
        row_color = "bg-green"; // Green background
      } else if (examination_planning_date) {
        row_color = "bg-orange"; // Orange background
      } else if (be_no && anyContainerArrivalDate) {
        row_color = "bg-yellow"; // Yellow background
      }

      return { ...job._doc, row_color }; // Add `row_color` field to job data
    });

    res.status(200).send({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: parseInt(page),
      jobs: jobsWithColors,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).send({ message: "Error fetching jobs" });
  }
});

export default router;
