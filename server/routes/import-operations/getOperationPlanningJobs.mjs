import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

// Function to build the search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } },
    { custom_house: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
    { "container_nos.detention_from": { $regex: search, $options: "i" } },
    { be_no: { $regex: search, $options: "i" } },
    { detailed_status: { $regex: search, $options: "i" } },
  ],
});

router.get("/api/get-operations-planning-jobs/:username",authenticateJWT, async (req, res) => {
  const { username } = req.params;
  const {
    page = 1,
    limit = 100,
    search = "",
    selectedICD = "",
    importer = "", // NEW: Capture importer from query params
    detailedStatusExPlan = "all",
    year,
  } = req.query;


  // Validate query parameters
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const selectedYear = year ? year.toString() : null; // ✅ Ensure it’s a string

  if (isNaN(pageNumber) || pageNumber < 1) {
    return res.status(400).json({ message: "Invalid page number" });
  }
  if (isNaN(limitNumber) || limitNumber < 1) {
    return res.status(400).json({ message: "Invalid limit value" });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // **Define the custom house condition based on username**
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

    // **Override with selected ICD if provided**
    if (selectedICD && selectedICD !== "All") {
      customHouseCondition = { custom_house: selectedICD };
    }

    
    const skip = (page - 1) * limit;
    const searchQuery = search ? buildSearchQuery(search) : {};

    // **Base conditions for job filtering**
    let baseConditions = {
      status: "Pending",
      be_no: { $exists: true, $ne: null, $ne: "", $not: /cancelled/i },
      container_nos: {
        $elemMatch: { arrival_date: { $exists: true, $ne: null, $ne: "" } },
      },
      $or: [
        { completed_operation_date: { $exists: false } },
        { completed_operation_date: "" },
      ],
    };

    // **Importer filter (NEW)**
    let importerCondition = {};
    if (importer && importer !== "Select Importer") {
      importerCondition = { importer: importer };
    }

    // **Detailed Status Filter**
    let statusExtraCondition = {};
    if (detailedStatusExPlan === "Arrival") {
      statusExtraCondition = {
        $and: [
          { $or: [{ pcv_date: { $exists: false } }, { pcv_date: "" }] },
          {
            $or: [
              { out_of_charge: { $exists: false } },
              { out_of_charge: "" },
              { out_of_charge: false },
            ],
          },
        ],
      };
    } else if (detailedStatusExPlan === "Ex. Planning") {
      statusExtraCondition = {
        examination_planning_date: { $exists: true, $nin: ["", null] },
        $and: [
          { $or: [{ pcv_date: { $exists: false } }, { pcv_date: "" }] },
          {
            $or: [
              { out_of_charge: { $exists: false } },
              { out_of_charge: "" },
              { out_of_charge: false },
            ],
          },
        ],
      };
    } else if (detailedStatusExPlan === "PCV") {
      statusExtraCondition = {
        pcv_date: { $exists: true, $nin: ["", null] },
        $or: [
          { out_of_charge: { $exists: false } },
          { out_of_charge: "" },
          { out_of_charge: false },
        ],
      };
    } else if (detailedStatusExPlan === "OOC") {
      statusExtraCondition = {
        out_of_charge: { $exists: true, $nin: ["", null] },
      };
    } else if (detailedStatusExPlan === "Do Completed") {
      statusExtraCondition = {
        do_completed: { $exists: true, $nin: ["", null] },
      };
    } else if (detailedStatusExPlan === "FC") {
      statusExtraCondition = {
        fristCheck: { $exists: true, $nin: ["", null] },
      };
    }

    // **Final Query: Merge All Conditions**
    const baseQuery = {
      $and: [
        customHouseCondition,
        baseConditions,
        statusExtraCondition,
        searchQuery,
        importerCondition, // NEW: Ensure importer filtering is applied
      ],
    };

       // ✅ Apply Year Filter if Provided
       if (selectedYear) {
        baseQuery.$and.push({ year: selectedYear });
      }
    // **Fetch Jobs**
    const jobs = await JobModel.find(baseQuery).sort({
      examination_planning_date: 1,
    });

    const totalJobs = jobs.length;

    // **Grouping jobs based on row colors**
    const greenJobs = [];
    const orangeJobs = [];
    const yellowJobs = [];
    const otherJobs = [];

    jobs.forEach((job) => {
      const { out_of_charge, examination_planning_date, be_no, container_nos } =
        job;
      const anyContainerArrivalDate = container_nos?.some(
        (container) => container.arrival_date
      );
      let row_color = "";

      if (out_of_charge) {
        row_color = "bg-green";
        greenJobs.push({ ...job._doc, row_color });
      } else if (examination_planning_date) {
        row_color = "bg-orange";
        orangeJobs.push({ ...job._doc, row_color });
      } else if (be_no && anyContainerArrivalDate) {
        row_color = "bg-yellow";
        yellowJobs.push({ ...job._doc, row_color });
      } else {
        otherJobs.push({ ...job._doc, row_color });
      }
    });

    // **Concatenating grouped jobs in the desired order**
    const groupedJobs = [
      ...greenJobs,
      ...orangeJobs,
      ...yellowJobs,
      ...otherJobs,
    ];

    // **Paginate grouped jobs**
    const paginatedJobs = groupedJobs.slice(skip, skip + Number(limit));

    res.status(200).send({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: parseInt(page),
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).send({ message: "Error fetching jobs" });
  }
});

export default router;
