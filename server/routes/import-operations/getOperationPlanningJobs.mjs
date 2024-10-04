import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";

const router = express.Router();

router.get("/api/get-operations-planning-jobs/:username", async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username });

  if (!user) {
    return res.status(200).send({ message: "User not found" });
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
      customHouseCondition = {}; // No additional filter for other users
      break;
  }

  const currentDate = new Date().toISOString().split("T")[0]; // Get the current date in yyyy-mm-dd format

  try {
    const jobs = await JobModel.find(
      {
        $and: [
          customHouseCondition, // Apply custom house condition based on username
          {
            status: "Pending", // Check status is "Pending"
            be_no: {
              $exists: true,
              $ne: null,
              $ne: "",
              $not: { $regex: "cancelled", $options: "i" },
            }, // Ensure `be_no` exists and is not empty or cancelled
          },
          {
            "container_nos.arrival_date": { $exists: true, $ne: null }, // Ensure at least one container has a valid `arrival_date`
          },
          {
            $or: [
              { examinationPlanning: true }, // Include jobs with `examinationPlanning: true`
              { "container_nos.arrival_date": { $gte: currentDate } }, // Include jobs with `arrival_date` on or after the current date
            ],
          },
        ],
      },
      "job_no be_no be_date container_nos importer examination_planning_date examination_planning_time pcv_date custom_house out_of_charge year"
    ).sort({ examination_planning_date: 1 });

    // Eliminate duplicates based on a unique field (e.g., _id or job_no)
    const uniqueJobs = Array.from(
      new Set(jobs.map((job) => job._id.toString()))
    ).map((id) => jobs.find((job) => job._id.toString() === id));

    // If no jobs found, send a message
    if (uniqueJobs.length === 0) {
      return res.status(200).send({ message: "No jobs found for this user" });
    }

    res.status(200).send(uniqueJobs);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error fetching jobs" });
  }
});

export default router;
