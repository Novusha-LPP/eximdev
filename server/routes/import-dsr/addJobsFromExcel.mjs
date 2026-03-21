import express from "express";
import JobModel from "../../model/jobModel.mjs";
import LastJobsDate from "../../model/jobsLastUpdatedOnModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { generateJobNumber } from "../../services/jobNumberService.mjs";
import { sanitizeJobPayload } from "../../utils/modeLogic.mjs";
// Initialize the router
const router = express.Router();

const formatDateToIST = () => {
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };

  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(new Date());

  const dateParts = {};
  parts.forEach(({ type, value }) => {
    dateParts[type] = value;
  });

  const year = dateParts.year;
  const month = dateParts.month;
  const day = dateParts.day;
  const hour = dateParts.hour;
  const minute = dateParts.minute;
  const second = dateParts.second;
  const dayPeriod = dateParts.dayPeriod.toLowerCase();

  return `${year}-${month}-${day} ${hour}:${minute}:${second} ${dayPeriod}`;
};

// Example usage:
const currentTimeIST = formatDateToIST();

// API to fetch job numbers with 'type_of_b_e' as 'In-Bond'
router.post(
  "/api/jobs/add-job-all-In-bond",
  authMiddleware,
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const jobs = await JobModel.find(
        { type_of_b_e: "In-Bond" },
        { job_number: 1, job_no: 1, importer: 1, be_no: 1, be_date: 1, ooc_copies: 1, _id: 0 } // Fetch job_no, importer, be_no, be_date, ooc_copies
      );
      res.status(200).json(jobs);
    } catch (error) {
      console.error("Error fetching In-Bond jobs:", error);
      res.status(500).json({ message: "Error fetching In-Bond jobs." });
    }
  }
);

// Route to add a new job
router.post(
  "/api/jobs/add-job-imp-man",
  authMiddleware,
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const {
        container_nos,
        importer,
        awb_bl_no,
        custom_house,
        year,
        branch_id,
        trade_type,
        mode,
      } = req.body;

      const financial_year = year;

      // ✅ Validate required fields
      if (!importer || !custom_house) {
        return res.status(400).json({ message: "Missing required fields." });
      }

      // ✅ Check for duplicate container numbers **only if container_nos is provided and not empty**
      if (container_nos && container_nos.length > 0) {
        // Prepare container numbers for checking
        const containerNumbers = container_nos
          .map((c) => c.container_number)
          .filter(cn => cn && cn.trim().length > 0);

        if (containerNumbers.length > 0) {
          const existingContainer = await JobModel.findOne({
            "container_nos.container_number": { $in: containerNumbers },
          });

          if (existingContainer) {
            return res.status(400).json({
              message: `Duplicate container number found globally: ${existingContainer.container_nos
                .map((c) => c.container_number)
                .filter(cn => containerNumbers.includes(cn))
                .join(", ")}`,
            });
          }
        }
      }

      // ✅ Check for duplicate BL Number globally
      if (awb_bl_no && awb_bl_no.length > 0) {
        const existingBl = await JobModel.findOne({ 
          awb_bl_no,
        });

        if (existingBl) {
          return res.status(400).json({
            message: `Duplicate BL number found globally: ${awb_bl_no}`,
          });
        }
      }

      // ✅ Validate branch_id
      if (!branch_id) {
        return res.status(400).json({ message: "Please select a branch." });
      }

      // ✅ Generate new structured job_number
      const { job_number, branch_code, sequence_number, job_no: newJobNo } = await generateJobNumber({
        branch_id,
        trade_type,
        mode,
        financial_year
      });

      console.log(`[AddJobRoute] Generated Job No: ${newJobNo}, Job Number: ${job_number}`);
      const getTodayDate = () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are zero-based
        const year = today.getFullYear();
        return `${year}-${month}-${day}`; // Format: YYYY-MM-DD
      };

      const todayDate = getTodayDate();

      // ✅ Create new job entry
      const newJob = new JobModel({
        ...sanitizeJobPayload(req.body), // Spread first so generated fields take precedence
        job_no: newJobNo,
        job_number,
        branch_id,
        branch_code,
        trade_type,
        mode,
        sequence_number,
        financial_year,
        job_date: todayDate,
      });

      // ✅ Save to database
      await newJob.save();

      // ✅ Update last job update date
      await LastJobsDate.findOneAndUpdate(
        {},
        { lastUpdatedOn: new Date() },
        { upsert: true, new: true }
      );

      res.status(201).json({
        message: "Job successfully created.",
        job: {
          job_no: newJob.job_no,
          job_number: newJob.job_number,
          custom_house: newJob.custom_house,
          importer: newJob.importer,
        },
      });
    } catch (error) {
      console.error("Error adding job:", error);

      // ✅ Return proper error messages
      res
        .status(500)
        .json({ message: error.message || "Internal server error." });
    }
  }
);

router.post(
  "/api/jobs/add-job",
  authMiddleware,
  auditMiddleware('Job'),
  async (req, res) => {
    const { jobs: jsonData, branch_id, branch_code, mode } = req.body;
    const CHUNK_SIZE = 1000; // Process 1000 jobs at a time

    console.log(`📊 [Backend] Starting to process ${jsonData.length} jobs for branch ${branch_code} and mode ${mode}...`);
    const startTime = Date.now();

    try {
      // Get unique year and job_no values for the batch query
      const years = [...new Set(jsonData.map((d) => d.year))];
      const jobNos = [...new Set(jsonData.map((d) => d.job_no))];

      console.log(`🔍 [Backend] Fetching existing jobs from database for ${years.length} years and ${jobNos.length} job numbers...`);
      
      const existingJobs = await JobModel.find({
        year: { $in: years },
        job_no: { $in: jobNos },
        branch_id: branch_id,
        mode: mode
      }).lean();

      // Create a Map for O(1) lookup
      const existingJobsMap = new Map();
      existingJobs.forEach((job) => {
        existingJobsMap.set(`${job.year}_${job.job_no}_${job.branch_id}_${job.mode}`, job);
      });

      console.log(
        `✅ [Backend] Found ${existingJobs.length} existing jobs. Building bulk operations...`
      );

      const bulkOperations = [];
      let processedCount = 0;

      for (const data of jsonData) {
        const sanitizedData = sanitizeJobPayload(data);
        const {
          year,
          job_no,
          be_no,
          be_date,
          invoice_number,
          invoice_date,
          awb_bl_no,
          awb_bl_date,
          bill_no,
          bill_date,
          no_of_pkgs,
          gross_weight,
          exrate,
          cif_amount,
          unit_price,
          vessel_berthing,
          gateway_igm_date,
          line_no,
          ie_code_no,
          container_nos,
          hss_name,
          total_inv_value,
        } = sanitizedData;

        // Sanitize bill_date before using it
        const sanitizedBillDate =
          typeof bill_date === "string"
            ? bill_date
            : bill_date != null
              ? String(bill_date)
              : "";

        // Define the filter to find existing jobs
        const filter = { year, job_no, branch_id, mode };

        // OPTIMIZATION: Use Map lookup instead of database query
        const lookupKey = `${year}_${job_no}_${branch_id}_${mode}`;
        const existingJob = existingJobsMap.get(lookupKey);
        let vesselBerthingToUpdate = existingJob?.vessel_berthing || "";
        let gateway_igm_dateUpdate = existingJob?.gateway_igm_date || "";
        let lineNoUpdate = existingJob?.line_no || "";
        let iceCodeUpdate = existingJob?.ie_code_no || "";

        // Only update vessel_berthing if it's empty in the database
        if (
          vessel_berthing &&
          (!vesselBerthingToUpdate || vesselBerthingToUpdate.trim() === "")
        ) {
          vesselBerthingToUpdate = vessel_berthing;
        }
        if (
          gateway_igm_date &&
          (!gateway_igm_dateUpdate || gateway_igm_dateUpdate.trim() === "")
        ) {
          gateway_igm_dateUpdate = gateway_igm_date;
        }
        if (line_no && (!lineNoUpdate || lineNoUpdate.trim() === "")) {
          lineNoUpdate = line_no;
        }
        if (ie_code_no) {
          iceCodeUpdate = ie_code_no;
        }

        // Apply selected branch and mode
        const trade_type = sanitizedData.trade_type || "IMP";
        const seqNum = parseInt(job_no, 10);
        const paddedSeq = !isNaN(seqNum) ? seqNum.toString().padStart(5, "0") : "00000";
        const financial_year = year || "24-25";
        
        // Re-generate job_number for consistency if branch/mode is provided
        const finalBranchCode = branch_code || existingJob?.branch_code || "AMD";
        const finalMode = mode || existingJob?.mode || "SEA";
        const finalBranchId = branch_id || existingJob?.branch_id;
        
        const job_number = `${finalBranchCode}/${trade_type}/${finalMode}/${paddedSeq}/${financial_year}`;

        if (existingJob) {
          // Logic to merge or update container sizes
          const existingContainers = existingJob.container_nos || [];
          const updatedContainers = existingContainers.map(
            (existingContainer) => {
              const newContainerData = container_nos?.find(
                (c) => c.container_number === existingContainer.container_number
              );

              return newContainerData
                ? {
                  ...existingContainer,
                  size: newContainerData.size,
                }
                : existingContainer;
            }
          );

          const update = {
            $set: {
              ...sanitizedData,
              job_number,
              branch_id: finalBranchId,
              branch_code: finalBranchCode,
              mode: finalMode,
              sequence_number: seqNum,
              financial_year,
              vessel_berthing: vesselBerthingToUpdate,
              gateway_igm_date: gateway_igm_dateUpdate,
              line_no: lineNoUpdate,
              ie_code_no: iceCodeUpdate,
              container_nos: updatedContainers,
              status:
                existingJob.status === "Completed"
                  ? existingJob.status
                  : computeStatus(sanitizedBillDate),
              be_no,
              be_date,
              invoice_number,
              invoice_date,
              awb_bl_no,
              awb_bl_date,
              bill_no,
              bill_date,
              no_of_pkgs,
              gross_weight,
              exrate,
              cif_amount,
              unit_price,
            },
          };

          bulkOperations.push({
            updateOne: {
              filter,
              update,
              upsert: true,
            },
          });
        } else {
          const update = {
            $set: {
              ...sanitizedData,
              job_number,
              branch_id: finalBranchId,
              branch_code: finalBranchCode,
              mode: finalMode,
              sequence_number: seqNum,
              financial_year,
              vessel_berthing: vesselBerthingToUpdate,
              gateway_igm_date: gateway_igm_dateUpdate,
              status: computeStatus(sanitizedBillDate),
            },
          };

          bulkOperations.push({
            updateOne: {
              filter,
              update,
              upsert: true,
            },
          });
        }

        processedCount++;

        // Log progress every 500 jobs during preparation
        if (processedCount % 500 === 0) {
          console.log(
            `📝 [Backend] Prepared ${processedCount} / ${jsonData.length} jobs`
          );
        }

        // Execute in chunks to prevent database timeout
        if (bulkOperations.length >= CHUNK_SIZE) {
          console.log(
            `💾 [Backend] Writing chunk of ${bulkOperations.length} jobs to database...`
          );
          await JobModel.bulkWrite(bulkOperations, { ordered: false });
          console.log(
            `✅ [Backend] Chunk written. Total processed: ${processedCount} / ${jsonData.length}`
          );
          bulkOperations.length = 0;
        }
      }

      // Execute remaining operations
      if (bulkOperations.length > 0) {
        console.log(
          `💾 [Backend] Writing final chunk of ${bulkOperations.length} jobs to database...`
        );
        await JobModel.bulkWrite(bulkOperations, { ordered: false });
        console.log(`✅ [Backend] Final chunk written successfully.`);
      }

      // Update the last jobs update date
      try {
        const existingDateDocument = await LastJobsDate.findOne();
        const date = new Date().toISOString(); // Changed to ISO string for consistency
        if (existingDateDocument) {
          existingDateDocument.date = date;
          await existingDateDocument.save();
        } else {
          const jobsLastUpdatedOn = new LastJobsDate({ date });
          await jobsLastUpdatedOn.save();
        }
      } catch (error) {
        console.error("Error updating the last jobs date:", error);
        return res
          .status(500)
          .send("An error occurred while updating the date.");
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `🎉 [Backend] All jobs processed successfully! Total: ${jsonData.length} jobs for branch ${branch_code} in ${totalTime} seconds`
      );

      res.status(200).json({ message: "Jobs added/updated successfully" });
    } catch (error) {
      console.error("Error handling job data:", error);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

// Route to update detailed_status for all pending jobs
router.get("/api/jobs/update-pending-status", async (req, res) => {
  try {
    // Step 1: Find all jobs where status is 'Pending'
    const pendingJobs = await JobModel.find({ status: "Pending" });

    if (!pendingJobs.length) {
      return res
        .status(200)
        .json({ message: "No jobs with pending status found." });
    }

    const bulkOperations = [];

    // Step 2: Iterate over each pending job and determine the detailed status
    pendingJobs.forEach((job) => {
      const newDetailedStatus = determineDetailedStatus(job);

      if (newDetailedStatus !== job.detailed_status) {
        // Step 3: Add bulk operation to update detailed_status
        bulkOperations.push({
          updateOne: {
            filter: { _id: job._id },
            update: { $set: { detailed_status: newDetailedStatus } },
          },
        });
      }
    });

    // Step 4: Perform bulkWrite operation if there are jobs to update
    if (bulkOperations.length) {
      await JobModel.bulkWrite(bulkOperations);
      return res.status(200).json({
        message: "Jobs updated successfully.",
        updatedCount: bulkOperations.length,
      });
    } else {
      return res.status(200).json({ message: "No jobs needed updating." });
    }
  } catch (error) {
    console.error("Error updating pending jobs:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

import { determineDetailedStatus } from "../../utils/determineDetailedStatus.mjs";

function computeStatus(billDate) {
  // Convert billDate to string if it's not already
  if (typeof billDate !== "string") {
    billDate = billDate != null ? String(billDate) : "";
    console.warn(`computeStatus: Converted billDate to string: "${billDate}"`);
  }

  // Now safely trim and evaluate billDate
  const trimmedBillDate = billDate.trim();

  if (!trimmedBillDate || trimmedBillDate === "--") {
    return "Pending";
  }
  return "Completed";
}

export default router;
