import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

// Utility function to build search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { awb_bl_no: { $regex: search, $options: "i" } },
    { shipping_line_airline: { $regex: search, $options: "i" } },
    { custom_house: { $regex: search, $options: "i" } },
    { vessel_flight: { $regex: search, $options: "i" } },
    { voyage_no: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
  ],
});

router.get("/api/get-do-module-jobs",authenticateJWT, async (req, res) => {
  try {
    // Extract and validate query parameters
    const { page = 1, limit = 100, search = "", importer, selectedICD, year } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const selectedYear = year ? year.trim() : ""; // ✅ Keep year as a string

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    const skip = (pageNumber - 1) * limitNumber;

    // Decode and trim query params
    const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";
    const decodedICD = selectedICD ? decodeURIComponent(selectedICD).trim() : "";

    // **Step 1: Define query conditions**
    const baseQuery = {
      $and: [
        { status: { $regex: /^pending$/i } },
        {
          $or: [
            {
              $and: [
                { 
                  $or: [{ do_completed: true }, { do_completed: "Yes" }, { do_completed: { $exists: true } }]
                },
                {
                  "container_nos.do_revalidation": {
                    $elemMatch: {
                      do_revalidation_upto: { $type: "string", $ne: "" },
                      do_Revalidation_Completed: false,
                    },
                  },
                },
              ],
            },
            {
              $and: [
                { $or: [{ doPlanning: true }, { doPlanning: "true" }] },
                {
                  $or: [
                    { do_completed: false },
                    { do_completed: "No" },
                    { do_completed: { $exists: false } },
                    { do_completed: "" },
                    { do_completed: null },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    if(selectedYear){
      baseQuery.$and.push({ year: selectedYear });
    }

    // ✅ Apply search filter if provided
    if (search) {
      baseQuery.$and.push(buildSearchQuery(search));
    }

    // ✅ Apply importer filter if provided
    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({ importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") } });
    }

    // ✅ Apply ICD filter if provided
    if (decodedICD && decodedICD !== "All ICDs") {
      baseQuery.$and.push({ custom_house: { $regex: new RegExp(`^${decodedICD}$`, "i") } });
    }

    // **Step 2: Fetch jobs after applying filters**
    const allJobs = await JobModel.find(baseQuery)
      .select(
        "job_no year importer awb_bl_no shipping_line_airline custom_house obl_telex_bl payment_made importer_address voyage_no be_no vessel_flight do_validity_upto_job_level container_nos do_Revalidation_Completed doPlanning documents cth_documents all_documents do_completed type_of_Do type_of_b_e consignment_type icd_code igm_no igm_date gateway_igm_date gateway_igm be_no checklist be_date processed_be_attachment line_no"
      )
      .lean();

    // **Step 3: Filter jobs where all `do_Revalidation_Completed` are true**
    const filteredJobs = allJobs.filter(
      (job) =>
        job.container_nos &&
        Array.isArray(job.container_nos) &&
        !job.container_nos.every(
          (container) =>
            Array.isArray(container.do_revalidation) &&
            container.do_revalidation.every(
              (revalidation) => revalidation.do_Revalidation_Completed === true
            )
        )
    );

    // Combine results and remove duplicates
    const uniqueJobs = [...new Set([...allJobs, ...filteredJobs])];

    // **Step 4: Calculate additional fields (displayDate & dayDifference)**
    const jobsWithCalculatedFields = uniqueJobs.map((job) => {
      const jobLevelDate = job.do_validity_upto_job_level
        ? new Date(job.do_validity_upto_job_level)
        : null;
      const containerLevelDate = job.container_nos?.[0]?.required_do_validity_upto
        ? new Date(job.container_nos[0].required_do_validity_upto)
        : null;

      const isJobLevelDateValid = jobLevelDate instanceof Date && !isNaN(jobLevelDate);
      const isContainerLevelDateValid = containerLevelDate instanceof Date && !isNaN(containerLevelDate);

      const isContainerDateHigher = isContainerLevelDateValid && containerLevelDate > jobLevelDate;

      const displayDate = isContainerDateHigher
        ? containerLevelDate.toISOString().split("T")[0]
        : isJobLevelDateValid
        ? jobLevelDate.toISOString().split("T")[0]
        : "";

      const dayDifference = isContainerDateHigher
        ? Math.ceil((containerLevelDate - jobLevelDate) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...job, 
        displayDate, 
        dayDifference, 
      };
    });

    // **Step 5: Sorting logic**
    jobsWithCalculatedFields.sort((a, b) => {
      if (a.dayDifference > 0 && b.dayDifference <= 0) return -1;
      if (a.dayDifference <= 0 && b.dayDifference > 0) return 1;
      if (a.dayDifference > 0 && b.dayDifference > 0) {
        return b.dayDifference - a.dayDifference; // Descending by dayDifference
      }
      return new Date(a.displayDate) - new Date(b.displayDate); // Ascending by displayDate
    });

    // **Step 6: Apply pagination**
    const totalJobs = jobsWithCalculatedFields.length;
    const paginatedJobs = jobsWithCalculatedFields.slice(skip, skip + limitNumber);

    // ✅ Return paginated response
    res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error("Error in /api/get-do-module-jobs:", error.stack || error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
});
router.get("/api/get-do-complete-module-jobs", async (req, res) => {
  try {
    // Extract and validate query parameters
    const { page = 1, limit = 100, search = "", importer, selectedICD, year } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const selectedYear = year ? year.trim() : ""; // ✅ Keep year as a string

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    const skip = (pageNumber - 1) * limitNumber;

    // Decode and trim query params
    const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";
    const decodedICD = selectedICD ? decodeURIComponent(selectedICD).trim() : "";

    // **Step 1: Define query conditions**
    const baseQuery = {
      $and: [
        { status: { $regex: /^pending$/i } },
        {
          $or: [
            { do_completed: true },
            { do_completed: "Yes" },
            { do_completed: { $exists: true, $ne: "" } },
          ],
        },
        {
          "container_nos.do_revalidation": {
            $not: {
              $elemMatch: {
                do_revalidation_upto: { $type: "string", $ne: "" },
                do_Revalidation_Completed: false,
              },
            },
          },
        },
      ],
    };
    
      
    
    if(selectedYear){
      baseQuery.$and.push({ year: selectedYear });
    }

    // ✅ Apply search filter if provided
    if (search) {
      baseQuery.$and.push(buildSearchQuery(search));
    }

    // ✅ Apply importer filter if provided
    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({ importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") } });
    }

    // ✅ Apply ICD filter if provided
    if (decodedICD && decodedICD !== "All ICDs") {
      baseQuery.$and.push({ custom_house: { $regex: new RegExp(`^${decodedICD}$`, "i") } });
    }

    // **Step 2: Fetch jobs after applying filters**
    const allJobs = await JobModel.find(baseQuery)
      .select(
        "job_no year importer awb_bl_no shipping_line_airline custom_house obl_telex_bl payment_made importer_address voyage_no be_no vessel_flight do_validity_upto_job_level container_nos do_Revalidation_Completed doPlanning documents cth_documents all_documents do_completed type_of_Do type_of_b_e consignment_type icd_code igm_no igm_date gateway_igm_date gateway_igm be_no checklist be_date processed_be_attachment line_no do_completed do_validity do_copies"
      )
      .lean();

    // **Step 3: Filter jobs where all `do_Revalidation_Completed` are true**
    const filteredJobs = allJobs.filter(
      (job) =>
        job.container_nos &&
        Array.isArray(job.container_nos) &&
        !job.container_nos.every(
          (container) =>
            Array.isArray(container.do_revalidation) &&
            container.do_revalidation.every(
              (revalidation) => revalidation.do_Revalidation_Completed === true
            )
        )
    );

    // Combine results and remove duplicates
    const uniqueJobs = [...new Set([...allJobs, ...filteredJobs])];

    // **Step 4: Calculate additional fields (displayDate & dayDifference)**
    const jobsWithCalculatedFields = uniqueJobs.map((job) => {
      const jobLevelDate = job.do_validity_upto_job_level
        ? new Date(job.do_validity_upto_job_level)
        : null;
      const containerLevelDate = job.container_nos?.[0]?.required_do_validity_upto
        ? new Date(job.container_nos[0].required_do_validity_upto)
        : null;

      const isJobLevelDateValid = jobLevelDate instanceof Date && !isNaN(jobLevelDate);
      const isContainerLevelDateValid = containerLevelDate instanceof Date && !isNaN(containerLevelDate);

      const isContainerDateHigher = isContainerLevelDateValid && containerLevelDate > jobLevelDate;

      const displayDate = isContainerDateHigher
        ? containerLevelDate.toISOString().split("T")[0]
        : isJobLevelDateValid
        ? jobLevelDate.toISOString().split("T")[0]
        : "";

      const dayDifference = isContainerDateHigher
        ? Math.ceil((containerLevelDate - jobLevelDate) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...job, 
        displayDate, 
        dayDifference, 
      };
    });

    // **Step 5: Sorting logic**
    jobsWithCalculatedFields.sort((a, b) => {
      if (a.dayDifference > 0 && b.dayDifference <= 0) return -1;
      if (a.dayDifference <= 0 && b.dayDifference > 0) return 1;
      if (a.dayDifference > 0 && b.dayDifference > 0) {
        return b.dayDifference - a.dayDifference; // Descending by dayDifference
      }
      return new Date(a.displayDate) - new Date(b.displayDate); // Ascending by displayDate
    });

    // **Step 6: Apply pagination**
    const totalJobs = jobsWithCalculatedFields.length;
    const paginatedJobs = jobsWithCalculatedFields.slice(skip, skip + limitNumber);

    // ✅ Return paginated response
    res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error("Error in /api/get-do-module-jobs:", error.stack || error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

export default router;

