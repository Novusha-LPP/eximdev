import express from "express";
import JobModel from "../../model/jobModel.mjs";
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";
const router = express.Router();

router.get("/api/get-completed-operations/:username", applyUserIcdFilter, async (req, res) => {
  try {
    console.log("🚀 Starting get-completed-operations API for user:", req.params.username);
    
    // Extract parameters
    const { username } = req.params;
    const {
      page = 1,
      limit = 100,
      search = "",
      selectedICD,
      importer,
      year,
    } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    // Use ICD filter from middleware (req.userIcdFilter)
    let icdCondition = req.userIcdFilter || {};
    console.log("📋 ICD Filter condition from middleware:", JSON.stringify(icdCondition, null, 2));

    // Apply selected ICD filter if provided (overrides user's ICD assignments)
    if (selectedICD && selectedICD !== "Select ICD") {
      icdCondition = {
        custom_house: new RegExp(`^${selectedICD}$`, "i"),
      };
      console.log("🔍 Selected ICD filter applied:", selectedICD);
    }

    // Apply importer filter
    let importerCondition = {};
    if (importer && importer !== "Select Importer") {
      importerCondition = { importer: new RegExp(`^${importer}$`, "i") };
      console.log("🏢 Importer filter applied:", importer);
    }

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { importer: { $regex: search, $options: "i" } },
          { custom_house: { $regex: search, $options: "i" } },
          { be_no: { $regex: search, $options: "i" } },
          {
            "container_nos.container_number": { $regex: search, $options: "i" },
          },
        ],
      };
      console.log("🔍 Search query applied:", search);
    }

    // Build final query
    const baseQuery = {
      $and: [
        icdCondition,
        importerCondition,
        searchQuery,
        {
          completed_operation_date: { $nin: [null, ""] },
          be_no: { $nin: [null, ""], $not: /cancelled/i },
          be_date: { $nin: [null, ""] },
          container_nos: {
            $elemMatch: { arrival_date: { $exists: true, $ne: null, $ne: "" } },
          },
        },
        year ? { year: year } : {},
      ].filter(condition => Object.keys(condition).length > 0), // Remove empty conditions
    };

    console.log("📊 Final MongoDB query:", JSON.stringify(baseQuery, null, 2));

    // Fetch data with pagination
    const allJobs = await JobModel.find(baseQuery)
      .sort({ completed_operation_date: -1 })
      .lean();

    const totalJobs = allJobs.length;
    const paginatedJobs = allJobs.slice(skip, skip + limitNumber);

    console.log(`✅ Found ${totalJobs} completed operations jobs for user ${username}`);

    // Send response
    res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error("❌ Error fetching completed operations:", error);
    res.status(500).json({ message: "Error fetching completed operations" });
  }
});

export default router;
