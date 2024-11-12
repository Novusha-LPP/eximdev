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

router.get(
  "/api/download-report/:year/:importerURL/:status",
  async (req, res) => {
    try {
      const { year, importerURL, status } = req.params;
      console.log(year, importerURL, status);

      // Create a query object with year and importerURL criteria
      const query = {
        year,
        importerURL,
        status,
      };

      // Query the database based on the criteria in the query object
      const jobs = await JobModel.find(query);

      // Sort jobs based on `detailed_status` rank and additional conditions
      jobs.sort((a, b) => {
        // First, sort by `detailed_status` rank
        const rankA = statusRank[a.detailed_status]?.rank || Infinity;
        const rankB = statusRank[b.detailed_status]?.rank || Infinity;

        if (rankA !== rankB) return rankA - rankB;

        // Secondary sorting within the same `detailed_status` group
        const field = statusRank[a.detailed_status]?.field;
        if (field) {
          const dateA = parseDate(a[field] || a.container_nos?.[0]?.[field]);
          const dateB = parseDate(b[field] || b.container_nos?.[0]?.[field]);
          if (dateA && dateB) return dateA - dateB;
          if (dateA) return -1;
          if (dateB) return 1;
        }

        // Tertiary sorting by `be_no` availability
        const aHasBeNo = a.be_no && a.be_no.trim() !== "";
        const bHasBeNo = b.be_no && b.be_no.trim() !== "";

        if (!aHasBeNo && !bHasBeNo) {
          const vesselDateA = parseDate(a.vessel_berthing);
          const vesselDateB = parseDate(b.vessel_berthing);
          if (vesselDateA && vesselDateB) return vesselDateA - vesselDateB;
          if (vesselDateA) return -1;
          if (vesselDateB) return 1;
        }

        // If one has `be_no` and the other doesn't, prioritize the one with `be_no`
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
