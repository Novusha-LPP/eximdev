import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";

const router = express.Router();

router.get("/api/get-operations-planning-list/:username", async (req, res) => {
  const { username } = req.params;
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
      customHouseCondition = {}; // No additional filter
      break;
  }

  try {
    // Fetch jobs with server-side filtering based on status, customHouseCondition, and detailed_status
    const jobs = await JobModel.find(
      {
        status: "Pending", // First check status "Pending"
        detailed_status: "BE Noted, Arrival Pending", // Then check for detailed_status
        ...customHouseCondition, // Apply the custom house condition
      },
      "job_no detailed_status importer status be_no be_date container_nos examination_planning_date examination_planning_time pcv_date custom_house out_of_charge year consignment_type type_of_b_e"
    )
      .lean() // Use lean() for improved performance
      .sort({ examination_planning_date: 1 });

    res.status(200).send(jobs); // Send filtered jobs
  } catch (error) {
    res.status(500).send({ message: "Server error", error });
  }
});

export default router;
