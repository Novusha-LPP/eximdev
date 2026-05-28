import express from "express";
const router = express.Router();
import JobModel from "../../model/jobModel.mjs";

// Status Rank Configuration
const statusRank = {
  "Do completed and Delivery pending": { rank: 1, field: "do_completed" },
  "Custom Clearance Completed": { rank: 2, field: "detention_from" },
  "PCV Done, Duty Payment Pending": { rank: 3, field: "detention_from" },
  "BE Noted, Clearance Pending": { rank: 4, field: "detention_from" },
  "BE Noted, Arrival Pending": { rank: 5, field: "be_date" },
  "Gateway IGM Filed": { rank: 6, field: "gateway_igm_date" },
  Discharged: { rank: 7, field: "discharge_date" },
  "Estimated Time of Arrival": { rank: 8, field: "vessel_berthing" },
  "ETA Date Pending": { rank: 9 },
};

// Helper function to parse dates safely
const parseDate = (dateStr) => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

router.get(
  "/api/download-report/:years/:importerURL/:status",
  async (req, res) => {
    try {
      let { years, importerURL, status } = req.params;

      // Convert years into an array
      let yearArray = years.split(",");

      // Create flexible regex patterns to handle both formats
      const escapedImporterURL = importerURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Pattern 1: Exact match (for backward compatibility)
      const exactPattern = `^${escapedImporterURL}$`;

      // Pattern 2: Handle periods and underscores interchangeably
      const flexiblePattern = escapedImporterURL
        .replace(/\./g, '[._]?')  // Periods become optional periods or underscores
        .replace(/_/g, '[._]?');  // Underscores become optional periods or underscores

      // Pattern 3: Handle "pvt" variations (pvt, pvt., pvt_, etc.)
      const pvtPattern = escapedImporterURL
        .replace(/pvt/g, 'pvt[._]?')
        .replace(/ltd/g, 'ltd[._]?');

      const { branchId, detailedStatus } = req.query;

      // MongoDB query with multiple pattern options
      const query = {
        year: { $in: yearArray },
        $or: [
          { importerURL: { $regex: new RegExp(exactPattern, 'i') } },
          { importerURL: { $regex: new RegExp(`^${flexiblePattern}$`, 'i') } },
          { importerURL: { $regex: new RegExp(`^${pvtPattern}$`, 'i') } }
        ],
        status,
      };

      if (branchId && branchId !== 'all') {
        query.branch_id = branchId;
      }

      console.log('Search patterns:', {
        exactPattern,
        flexiblePattern,
        pvtPattern,
        receivedImporterURL: importerURL
      });

      let jobs = await JobModel.find(query);

      console.log(`Found ${jobs.length} jobs before filtering`);

      // ✅ Additional Security Check: Ensure all jobs have the same ie_code_no to avoid data mismatch
      if (jobs.length > 0) {
        const ieCodeCounts = {};
        jobs.forEach(job => {
          const ieCode = (job.ie_code_no || "").trim();
          if (ieCode) {
            ieCodeCounts[ieCode] = (ieCodeCounts[ieCode] || 0) + 1;
          }
        });

        // Find the dominant ie_code_no (the most common non-empty IEC)
        let dominantIeCode = "";
        let maxCount = 0;
        for (const [ieCode, count] of Object.entries(ieCodeCounts)) {
          if (count > maxCount) {
            maxCount = count;
            dominantIeCode = ieCode;
          }
        }

        // If a dominant IE Code exists, filter the results strictly to match it
        if (dominantIeCode) {
          const initialCount = jobs.length;
          jobs = jobs.filter(job => (job.ie_code_no || "").trim() === dominantIeCode);
          if (jobs.length < initialCount) {
            console.warn(`[Security Check] Mismatched IE Codes detected. Filtered out ${initialCount - jobs.length} jobs that did not match dominant IE Code: ${dominantIeCode}`);
          }
        }
      }

      // Filter by detailedStatus if provided, otherwise filter out "Billing Pending" by default
      const statusMapping = {
        billed: "Billed",
        billing_pending: "Billing Pending",
        eta_date_pending: "ETA Date Pending",
        estimated_time_of_arrival: "Estimated Time of Arrival",
        gateway_igm_filed: "Gateway IGM Filed",
        discharged: "Discharged",
        rail_out: "Rail Out",
        be_noted_arrival_pending: "BE Noted, Arrival Pending",
        be_noted_clearance_pending: "BE Noted, Clearance Pending",
        pcv_done_duty_payment_pending: "PCV Done, Duty Payment Pending",
        custom_clearance_completed: "Custom Clearance Completed",
      };

      if (detailedStatus && detailedStatus !== "all") {
        const mappedStatus = statusMapping[detailedStatus] || detailedStatus;
        jobs = jobs.filter((job) => job.detailed_status === mappedStatus);
      } else {
        jobs = jobs.filter((job) => job.detailed_status !== "Billing Pending");
      }

      console.log(`Found ${jobs.length} jobs after filtering`);

      // Log found jobs for debugging
      jobs.forEach(job => {
        console.log(`Job ${job.job_no}: ${job.importerURL} - ${job.detailed_status}`);
      });

      // Rest of your sorting logic...
      jobs.sort((a, b) => {
        // Sort by year (24-25 first, then 25-26)
        if (a.year !== b.year) {
          return a.year.localeCompare(b.year);
        }

        // Sort by detailed status rank
        const rankA = statusRank[a.detailed_status]?.rank || Infinity;
        const rankB = statusRank[b.detailed_status]?.rank || Infinity;
        if (rankA !== rankB) return rankA - rankB;

        // Sort by date within the same status
        const field = statusRank[a.detailed_status]?.field;
        if (field) {
          const dateA = parseDate(a[field] || a.container_nos?.[0]?.[field]);
          const dateB = parseDate(b[field] || b.container_nos?.[0]?.[field]);
          if (dateA && dateB) return dateA - dateB;
          if (dateA) return -1;
          if (dateB) return 1;
        }

        // Handle `be_no` availability
        const aHasBeNo = a.be_no && a.be_no.trim() !== "";
        const bHasBeNo = b.be_no && b.be_no.trim() !== "";

        if (aHasBeNo && !bHasBeNo) return -1;
        if (!aHasBeNo && bHasBeNo) return 1;

        return 0;
      });

      res.send(jobs);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
