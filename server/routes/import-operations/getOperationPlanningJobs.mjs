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

    const jobs = await JobModel.find(
      {
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
        ],
      },
      "job_no status detailed_status be_no be_date container_nos importer examination_planning_date examination_planning_time pcv_date custom_house out_of_charge year"
    ).sort({ examination_planning_date: 1 });

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

    res.status(200).send(jobsWithColors); // Return jobs with row colors
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).send({ message: "Error fetching jobs" });
  }
});

export default router;
