import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";
const router = express.Router();

router.get("/api/get-completed-operations/:username", applyUserIcdFilter, async (req, res) => {
  try {    
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
    } else if (selectedICD && selectedICD !== "Select ICD") {
      // Only apply frontend selection if user has full access (no middleware restrictions)
      icdCondition = {
        custom_house: new RegExp(`^${selectedICD}$`, "i"),
      };
    }
    // If req.userIcdFilter is null, user has full access (admin or "ALL" ICD code)

    // Apply importer filter
    let importerCondition = {};
    if (importer && importer !== "Select Importer") {
      importerCondition = { importer: new RegExp(`^${importer}$`, "i") };
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


    // Fetch data with pagination
    const allJobs = await JobModel.find(baseQuery)
      .sort({ completed_operation_date: -1 })
      .lean();

    const totalJobs = allJobs.length;
    const paginatedJobs = allJobs.slice(skip, skip + limitNumber);

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
