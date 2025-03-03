import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";

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

router.get("/api/get-operations-planning-jobs/:username", async (req, res) => {
  const { username } = req.params;
  const {
    page = 1,
    limit = 100,
    search = "",
    selectedICD = "",
    importer = "", // Added from get-operations-planning-list
    detailedStatusExPlan = "all", // defaults to all if not provided
    year, // if you need to filter by year later, you'll capture it here
  } = req.query;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // **Define custom house condition based on username**
    let customHouseCondition = {};
    switch (username) {
      case "majhar_khan":
        customHouseCondition = { custom_house: { $in: ["ICD SANAND", "ICD SACHANA"] } };
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

    // **Override with selectedICD if provided**
    if (selectedICD) {
      customHouseCondition = { custom_house: selectedICD };
    }

    const skip = (page - 1) * limit;

    // **Build search conditions**
    let searchQuery = [];
    if (search) {
      searchQuery.push({
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { importer: { $regex: search, $options: "i" } },
          { be_no: { $regex: search, $options: "i" } },
          { custom_house: { $regex: search, $options: "i" } },
        ],
      });
    }

    // **Apply importer filter only if it's NOT "Select Importer"**
    if (importer && importer !== "Select Importer") {
      searchQuery.push({ importer: importer });
    }

    // **Base conditions (common for all jobs)**
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

    // **Detailed status filtering**
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
    } else if (detailedStatusExPlan === "Frist Check") {
      statusExtraCondition = {
        fristCheck: { $exists: true, $nin: ["", null] },
      };
    }

    // **Combine all conditions**
    const filterConditions = {
      $and: [
        customHouseCondition,
        baseConditions,
        statusExtraCondition,
        ...searchQuery, // Merge search queries properly
      ],
    };

    console.log("Filter Conditions:", JSON.stringify(filterConditions, null, 2));

    // **Fetch total job count**
    const totalJobs = await JobModel.countDocuments(filterConditions);

    // **Fetch paginated jobs**
    const jobs = await JobModel.find(filterConditions)
      .select(
        "job_no detailed_status importer status be_no be_date container_nos examination_planning_date custom_house year consignment_type type_of_b_e cth_documents all_documents job_sticker_upload verified_checklist_upload invoice_number invoice_date loading_port no_of_pkgs description gross_weight job_net_weight gateway_igm gateway_igm_date igm_no igm_date awb_bl_no awb_bl_date shipping_line_airline"
      )
      .sort({ examination_planning_date: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // **Row color logic (unchanged)**
    const greenJobs = [];
    const orangeJobs = [];
    const yellowJobs = [];
    const otherJobs = [];

    jobs.forEach((job) => {
      const { out_of_charge, examination_planning_date, be_no, container_nos } = job;
      const anyContainerArrivalDate = container_nos?.some((container) => container.arrival_date);
      let row_color = "";
      if (out_of_charge) {
        row_color = "bg-green";
        greenJobs.push({ ...job, row_color });
      } else if (examination_planning_date) {
        row_color = "bg-orange";
        orangeJobs.push({ ...job, row_color });
      } else if (be_no && anyContainerArrivalDate) {
        row_color = "bg-yellow";
        yellowJobs.push({ ...job, row_color });
      } else {
        otherJobs.push({ ...job, row_color });
      }
    });

    // **Concatenate jobs in order**
    const groupedJobs = [...greenJobs, ...orangeJobs, ...yellowJobs, ...otherJobs];

    // **Paginate grouped jobs**
    const paginatedJobs = groupedJobs.slice(skip, skip + Number(limit));

    // **Send response**
    res.status(200).send({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: parseInt(page, 10),
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
});


export default router;
