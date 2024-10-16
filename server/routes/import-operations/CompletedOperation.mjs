import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";

const router = express.Router();

router.get("/api/get-completed-operations/:username", async (req, res) => {
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

  try {
    const jobs = await JobModel.find(
      {
        $and: [
          customHouseCondition, // Apply custom house condition based on username
          {
            completed_operation_date: {
              $exists: true,
              $ne: null,
              $ne: "", // Ensure `completed_operation_date` exists, is not null, and is not empty
            },
          },
        ],
      },
      "job_no status completed_operation_date be_no be_date container_nos importer examination_planning_date examination_planning_time pcv_date custom_house out_of_charge year"
    ).sort({ completed_operation_date: -1 }); // Sort by completed_operation_date in descending order

    // Eliminate duplicates based on a unique field (e.g., _id or job_no)
    const uniqueJobs = Array.from(
      new Set(jobs.map((job) => job._id.toString()))
    ).map((id) => jobs.find((job) => job._id.toString() === id));

    // If no jobs found, send a message
    if (uniqueJobs.length === 0) {
      return res
        .status(200)
        .send({ message: "No completed operations found for this user" });
    }

    res.status(200).send(uniqueJobs);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error fetching completed operations" });
  }
});

export default router;
