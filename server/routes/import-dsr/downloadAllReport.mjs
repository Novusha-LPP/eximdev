import express from "express";
const router = express.Router();
import JobModel from "../../model/jobModel.mjs";

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
router.get("/api/download-report/:years/:status", async (req, res) => {
  try {
    let { years, status } = req.params;
    // Convert years into an array (e.g., "24-25,25-26" to ["24-25", "25-26"])
    let yearArray = years.split(",");

    const { branchId, detailedStatus } = req.query;

    // MongoDB query to match any year in the array
    const query = {
      year: { $in: yearArray },
      status,
    };

    if (branchId && branchId !== 'all') {
      query.branch_id = branchId;
    }

    let jobs = await JobModel.find(query);

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

    // Sort data first by year, then by status rank
    jobs.sort((a, b) => {
      // Sort by year (24-25 comes first, then 25-26)
      if (a.year !== b.year) {
        return a.year.localeCompare(b.year);
      }

      // Priority 1: LCL jobs at top
      const isLclA = String(a.consignment_type || "").trim().toUpperCase() === "LCL" ? 0 : 1;
      const isLclB = String(b.consignment_type || "").trim().toUpperCase() === "LCL" ? 0 : 1;
      if (isLclA !== isLclB) return isLclA - isLclB;

      // Priority 2: Detailed status rank
      const rankA = statusRank[a.detailed_status]?.rank || Infinity;
      const rankB = statusRank[b.detailed_status]?.rank || Infinity;
      if (rankA !== rankB) return rankA - rankB;

      // Priority 3: Oldest date within status
      const field = statusRank[a.detailed_status]?.field;
      if (field) {
        const dateA = parseDate(a[field] || a.container_nos?.[0]?.[field]);
        const dateB = parseDate(b[field] || b.container_nos?.[0]?.[field]);
        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1;
        if (dateB) return 1;
      }

      // Fallback to job_date or createdAt for oldest date
      const fallbackA = parseDate(a.job_date || a.createdAt);
      const fallbackB = parseDate(b.job_date || b.createdAt);
      if (fallbackA && fallbackB) return fallbackA - fallbackB;

      return 0;
    });

    res.send(jobs);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
