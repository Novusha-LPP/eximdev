import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";

const router = express.Router();

router.get(
  "/api/get-completed-operations/:username",
  applyUserIcdFilter,
  async (req, res) => {
    try {
      const { username } = req.params;
      const {
        page = 1,
        limit = 100,
        search = "",
        selectedICD,
        importer,
        year,
        unresolvedOnly,
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

      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      // ICD condition
      let icdCondition = {};
      if (req.userIcdFilter) {
        icdCondition = req.userIcdFilter;
      } else if (selectedICD && selectedICD !== "Select ICD") {
        icdCondition = {
          custom_house: new RegExp(`^${selectedICD}$`, "i"),
        };
      }

      // Importer condition
      let importerCondition = {};
      if (importer && importer !== "Select Importer") {
        importerCondition = {
          importer: new RegExp(`^${importer}$`, "i"),
        };
      }

      // Search condition
      let searchCondition = {};
      if (search) {
        searchCondition = {
          $or: [
            { job_no: { $regex: search, $options: "i" } },
            { importer: { $regex: search, $options: "i" } },
            { custom_house: { $regex: search, $options: "i" } },
            { be_no: { $regex: search, $options: "i" } },
            {
              "container_nos.container_number": {
                $regex: search,
                $options: "i",
              },
            },
          ],
        };
      }

      // Base AND conditions
      const andConditions = [
        icdCondition,
        importerCondition,
        searchCondition,
        {
          completed_operation_date: { $nin: [null, ""] },
          be_no: { $nin: [null, ""], $not: /cancelled/i },
          be_date: { $nin: [null, ""] },
          container_nos: {
            $elemMatch: {
              arrival_date: { $exists: true, $ne: null, $ne: "" },
            },
          },
        },
      ];

      if (year) {
        andConditions.push({ year });
      }

      if (unresolvedOnly === "true") {
        andConditions.push({
          dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
        });
      }

      const baseQuery =
        andConditions.length > 0 ? { $and: andConditions } : {};

      // Query for unresolvedCount (always with unresolved filter)
      const unresolvedQueryAnd = andConditions.filter(
        (c) => !c.dsr_queries
      );
      unresolvedQueryAnd.push({
        dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
      });
      const unresolvedQuery =
        unresolvedQueryAnd.length > 0 ? { $and: unresolvedQueryAnd } : {};

      // Projection to shrink sort payload
// Projection to shrink sort payload and response
const projection = {
  job_no: 1,
  importer: 1,
  custom_house: 1,
  be_no: 1,
  be_date: 1,
  year: 1,
  completed_operation_date: 1,
  examination_planning_date: 1,
  pcv_date: 1,
  out_of_charge: 1,
  dsr_queries: 1,
  // only needed container fields
  "container_nos.container_number": 1,
  "container_nos.size": 1,
  "container_nos.arrival_date": 1,
};

const pipeline = [
  { $match: baseQuery },
  { $project: projection },
  {
    $sort: {
      completed_operation_date: -1,
      _id: 1,
    },
  },
  {
    $facet: {
      metadata: [{ $count: "totalJobs" }],
      data: [{ $skip: skip }, { $limit: limitNumber }],
    },
  },
];

const aggResult = await JobModel.aggregate(pipeline)
  .allowDiskUse(true)
  .exec();

const meta = aggResult[0]?.metadata?.[0] || { totalJobs: 0 };
const jobs = aggResult[0]?.data || [];
const totalJobs = meta.totalJobs || 0;

// unresolvedCount: just count, no select needed
const unresolvedCount = await JobModel.countDocuments(unresolvedQuery);

res.status(200).json({
  totalJobs,
  totalPages: Math.ceil(totalJobs / limitNumber),
  currentPage: pageNumber,
  jobs,
  unresolvedCount,
});

    } catch (error) {
      console.error("❌ Error fetching completed operations:", error);
      res.status(500).json({ message: "Error fetching completed operations" });
    }
  }
);

export default router;
