import express from "express";
import JobModel from "../../model/jobModel.mjs";
import User from "../../model/userModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-completed-operations/:username",authenticateJWT, async (req, res) => {
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

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // **Step 1: Define Custom House Conditions Based on Username**
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
        customHouseCondition = {};
        break;
    }

    // **Step 2: Apply Selected ICD Filter**
    if (selectedICD && selectedICD !== "Select ICD") {
      customHouseCondition = {
        custom_house: new RegExp(`^${selectedICD}$`, "i"),
      };
    }

    // **Step 3: Apply Importer Filter**
    let importerCondition = {};
    if (importer && importer !== "Select Importer") {
      importerCondition = { importer: new RegExp(`^${importer}$`, "i") };
    }

    // **Step 4: Build Search Query**
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
    // **Step 5: Build Final Query**
    const baseQuery = {
      $and: [
        customHouseCondition,
        importerCondition, // ✅ Importer Filter
        searchQuery, // ✅ Search Query
        {
          completed_operation_date: { $nin: [null, ""] },
          be_no: { $nin: [null, ""], $not: /cancelled/i },
          be_date: { $nin: [null, ""] },
          container_nos: {
            $elemMatch: { arrival_date: { $exists: true, $ne: null, $ne: "" } },
          },
        },
        year ? { year: year } : {}, // ✅ Add year filter only if provided
      ],
    };

    // **Step 6: Fetch Data with Pagination**
    const allJobs = await JobModel.find(baseQuery)
      .sort({ completed_operation_date: -1 })
      .lean();

    const totalJobs = allJobs.length;
    const paginatedJobs = allJobs.slice(skip, skip + limitNumber);

    // ✅ Send Response
    res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error("Error fetching completed operations:", error);
    res.status(500).json({ message: "Error fetching completed operations" });
  }
});

export default router;
