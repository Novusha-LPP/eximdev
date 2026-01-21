import express from "express";
// JobModel is now attached to req by branchJobMiddleware
import User from "../../model/userModel.mjs";
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";

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

router.get("/api/get-operations-planning-jobs/:username", applyUserIcdFilter, async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    const { username } = req.params;
    const {
      page = 1,
      limit = 100,
      search = "",
      selectedICD = "",
      importer = "", // NEW: Capture importer from query params
      detailedStatusExPlan = "all",
      year,
      unresolvedOnly
    } = req.query;

    // Arrival condition: allow missing arrival_date only for Ex-Bond jobs,
    // otherwise require at least one container with a arrival_date.
    const arrivalCondition = {
      $or: [
        // match Ex-Bond, Ex Bond, ex-bond, etc.
        { type_of_b_e: { $regex: /^Ex-?Bond$/i } },
        {
          container_nos: {
            $elemMatch: {
              arrival_date: { $exists: true, $nin: [null, ""] },
            },
          },
        },
      ],
    };

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

    // ✅ Validate user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // ✅ Use middleware-based ICD filtering instead of allowing frontend override
    let icdCondition = {};
    if (req.userIcdFilter) {
      // User has specific ICD restrictions from middleware - RESPECT THESE
      icdCondition = req.userIcdFilter;
    } else if (selectedICD && selectedICD !== "All" && selectedICD !== "Select ICD") {
      // Only apply frontend selection if user has full access (no middleware restrictions)
      icdCondition = { custom_house: selectedICD };
    }
    // If req.userIcdFilter is null, user has full access (admin or "ALL" ICD code)


    const skip = (page - 1) * limit;
    const searchQuery = search ? buildSearchQuery(search) : {};

    // **Base conditions for job filtering**
    // **Base conditions for job filtering**
    let baseConditions = {
      status: "Pending",
      be_no: { $exists: true, $ne: null, $ne: "", $not: /cancelled/i },
      $and: [
        arrivalCondition,
        {
          $or: [
            { completed_operation_date: { $exists: false } },
            { completed_operation_date: "" },
            {
              $and: [
                { completed_operation_date: { $exists: true, $ne: "" } },
                { dsr_queries: { $elemMatch: { select_module: "Operations", resolved: { $ne: true } } } }
              ]
            }
          ],
        },
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
        firstCheck: { $exists: true, $nin: ["", null] },
      };
    }

    // **Final Query: Merge All Conditions**
    const baseQuery = {
      $and: [
        icdCondition,
        baseConditions,
        statusExtraCondition,
        searchQuery,
        importerCondition, // NEW: Ensure importer filtering is applied
      ].filter(condition => Object.keys(condition).length > 0), // Remove empty conditions
    };

    if (unresolvedOnly === "true") {
      baseQuery.$and.push({
        dsr_queries: { $elemMatch: { resolved: { $ne: true } } }
      });
    }

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
      // explicit boolean: at least one container has a non-empty arrival_date
      const anyContainerArrivalDate = Array.isArray(container_nos) &&
        container_nos.some((container) => container && container.arrival_date && container.arrival_date !== "");

      if (out_of_charge) {
        greenJobs.push({ ...job._doc });
      } else if (examination_planning_date) {
        orangeJobs.push({ ...job._doc });
      } else if (be_no && anyContainerArrivalDate) {
        yellowJobs.push({ ...job._doc });
      } else {
        otherJobs.push({ ...job._doc });
      }
    });
    // **Concatenating grouped jobs in the desired order**
    const groupedJobs = [
      ...greenJobs,
      ...orangeJobs,
      ...yellowJobs,
      ...otherJobs,
    ];


    const unresolvedQueryBase = { ...baseQuery };
    unresolvedQueryBase.$and = unresolvedQueryBase.$and.filter(condition =>
      !condition.hasOwnProperty('dsr_queries') // Remove the unresolved filter temporarily
    );
    unresolvedQueryBase.$and.push({
      dsr_queries: { $elemMatch: { resolved: { $ne: true } } }
    });

    const unresolvedCount = await JobModel.countDocuments(unresolvedQueryBase);


    // **Paginate grouped jobs**
    const paginatedJobs = groupedJobs.slice(skip, skip + Number(limit));

    res.status(200).send({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: parseInt(page),
      jobs: paginatedJobs,
      unresolvedCount

    });
  } catch (error) {
    console.error("❌ Error fetching operations planning jobs:", error);
    res.status(500).send({ message: "Error fetching jobs" });
  }
});

export default router;
