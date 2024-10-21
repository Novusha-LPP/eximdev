import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Status Rank Configuration
const statusRank = {
  "Custom Clearance Completed": { rank: 1, field: "detention_from" },
  "PCV Done, Duty Payment Pending": { rank: 2, field: "detention_from" },
  "BE Noted, Clearance Pending": { rank: 3, field: "detention_from" },
  "BE Noted, Arrival Pending": { rank: 4, field: "be_date" },
  "Gateway IGM Filed": { rank: 5, field: "gateway_igm_date" },
  Discharged: { rank: 6, field: "discharge_date" },
  "Estimated Time of Arrival": { rank: 7, field: "vessel_berthing" },
};

// Helper function to parse dates safely
const parseDate = (dateStr) => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// API to fetch jobs with rank-based sorting and pagination
router.get("/api/:year/jobs/:status/:detailedStatus", async (req, res) => {
  try {
    const { year, status, detailedStatus } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const skip = (page - 1) * limit;

    // Build query object
    const query = { year };

    if (status === "Cancelled") {
      query.$or = [
        { status: "Cancelled" },
        { status: "Pending", be_no: "CANCELLED" },
        { status: "Completed", be_no: "CANCELLED" },
        { be_no: "CANCELLED" },
      ];
    } else {
      query.status = status;
      query.be_no = { $ne: "CANCELLED" };
    }

    if (detailedStatus !== "all") {
      const statusMapping = {
        estimated_time_of_arrival: "Estimated Time of Arrival",
        discharged: "Discharged",
        gateway_igm_filed: "Gateway IGM Filed",
        be_noted_arrival_pending: "BE Noted, Arrival Pending",
        be_noted_clearance_pending: "BE Noted, Clearance Pending",
        pcv_done_duty_payment_pending: "PCV Done, Duty Payment Pending",
        custom_clearance_completed: "Custom Clearance Completed",
      };
      query.detailed_status = statusMapping[detailedStatus] || detailedStatus;
    }

    // Define field selection logic
    const defaultFields = `
      job_no year importer custom_house awb_bl_no container_nos vessel_berthing 
      gateway_igm_date discharge_date detailed_status be_no be_date loading_port 
      port_of_reporting type_of_b_e consignment_type shipping_line_airline 
    `;
    const additionalFieldsByStatus = {
      be_noted_clearance_pending: "",
      pcv_done_duty_payment_pending: "out_of_charge pcv_date",
      custom_clearance_completed: "out_of_charge",
    };
    const getSelectedFields = (status) =>
      `${defaultFields} ${additionalFieldsByStatus[status] || ""}`.trim();

    // Fetch matching jobs from the database
    let jobs = await JobModel.find(query).select(
      detailedStatus === "all"
        ? getSelectedFields("all")
        : getSelectedFields(detailedStatus)
    );

    // Group and sort jobs by status rank
    const rankedJobs = [];
    const unrankedJobs = [];

    jobs.forEach((job) => {
      if (statusRank[job.detailed_status]) {
        rankedJobs.push(job);
      } else {
        unrankedJobs.push(job); // Collect jobs with no matching status rank
      }
    });

    // Sort the ranked jobs by their defined field and rank
    const sortedRankedJobs = Object.entries(statusRank).reduce(
      (acc, [status, { field }]) => {
        const filteredJobs = rankedJobs
          .filter((job) => job.detailed_status === status)
          .sort((a, b) => {
            const dateA = parseDate(a.container_nos?.[0]?.[field] || a[field]);
            const dateB = parseDate(b.container_nos?.[0]?.[field] || b[field]);
            return dateA - dateB;
          });
        return [...acc, ...filteredJobs];
      },
      []
    );

    // Combine ranked jobs followed by unranked jobs
    const allJobs = [...sortedRankedJobs, ...unrankedJobs];

    // Apply pagination
    const paginatedJobs = allJobs.slice(skip, skip + parseInt(limit));

    res.json({
      data: paginatedJobs,
      total: allJobs.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(allJobs.length / limit),
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
