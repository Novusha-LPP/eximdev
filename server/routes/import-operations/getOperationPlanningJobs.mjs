import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";

const router = express.Router();

router.get("/api/get-operations-planning-jobs/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(200).send({ message: "User not found" });
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

    const currentDate = new Date().toISOString().split("T")[0]; // Get current date in yyyy-mm-dd format

    const jobs = await JobModel.find(
      {
        $and: [
          customHouseCondition, // Apply custom house filter
          {
            status: "Pending", // Check status is "Pending"
            be_no: {
              $exists: true,
              $ne: null,
              $ne: "",
              $not: { $regex: "cancelled", $options: "i" },
            }, // Ensure `be_no` exists and is not cancelled
            "container_nos.arrival_date": {
              $exists: true,
              $ne: null,
              $ne: "",
            }, // Ensure at least one container has an arrival date
            $or: [
              { completed_operation_date: { $exists: false } }, // Include jobs where `completed_operation_date` does not exist
              { completed_operation_date: "" }, // Include jobs with empty `completed_operation_date`
            ],
          },
        ],
      },
      // Fields to select
      "job_no status detailed_status be_no be_date container_nos importer examination_planning_date examination_planning_time pcv_date custom_house out_of_charge year"
    ).sort({ examination_planning_date: 1 });

    // Eliminate duplicate jobs by their _id field
    const uniqueJobs = Array.from(
      new Set(jobs.map((job) => job._id.toString()))
    ).map((id) => jobs.find((job) => job._id.toString() === id));

    // Send response if no jobs are found
    if (uniqueJobs.length === 0) {
      return res.status(200).send({ message: "No jobs found for this user" });
    }

    // Send the unique jobs in response
    res.status(200).send(uniqueJobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).send({ message: "Error fetching jobs" });
  }
});

export default router;
