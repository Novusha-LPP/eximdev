import express from "express";
const router = express.Router();
// JobModel is now attached to req by branchJobMiddleware

// Status Rank Configuration
const statusRank = {
  "Custom Clearance Completed": { rank: 1, field: "detention_from" },
  "PCV Done, Duty Payment Pending": { rank: 2, field: "detention_from" },
  "BE Noted, Clearance Pending": { rank: 3, field: "detention_from" },
  "BE Noted, Arrival Pending": { rank: 4, field: "be_date" },
  "Gateway IGM Filed": { rank: 5, field: "gateway_igm_date" },
  Discharged: { rank: 6, field: "discharge_date" },
  "Estimated Time of Arrival": { rank: 7, field: "vessel_berthing" },
  "ETA Date Pending": { rank: 8 },
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
      // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
      const JobModel = req.JobModel;

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

      console.log('Search patterns:', {
        exactPattern,
        flexiblePattern,
        pvtPattern,
        receivedImporterURL: importerURL
      });

      let jobs = await JobModel.find(query);

      console.log(`Found ${jobs.length} jobs before filtering`);

      // Filter out jobs with `detailed_status` as "Billing Pending"
      jobs = jobs.filter((job) => job.detailed_status !== "Billing Pending");

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
