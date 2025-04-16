import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/dsr/:year",authenticateJWT, async (req, res) => {
  try {
    const { year } = req.params;
    const formattedStatus = "Pending";

    // Create a query object with year
    const query = {
      year,
      status: formattedStatus,
    };

    // Query the database based on the criteria in the query object
    const jobs = await JobModel.find(query).select(
      "job_no importer job_date supplier_exporter invoice_number invoice_date awb_bl_no awb_bl_date commodity no_of_pkgs net_weight loading_port free_time container_nos transporter remarks detailed_status do_completed do_validity"
    );

    jobs.sort((a, b) => {
      // 1st priority: 'Custom Clearance Completed'
      if (a.detailed_status === "Custom Clearance Completed") return -1;
      if (b.detailed_status === "Custom Clearance Completed") return 1;

      // Check if be_no is missing or empty
      const aHasBeNo = a.be_no && a.be_no.trim() !== "";
      const bHasBeNo = b.be_no && b.be_no.trim() !== "";

      // Function to parse and validate dates
      const parseDate = (dateStr) => {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };

      // Convert vessel_berthing to valid Date objects or null if invalid
      const dateA = parseDate(a.vessel_berthing);
      const dateB = parseDate(b.vessel_berthing);

      // 2nd priority: if be_no is not available, sort by valid vessel_berthing date
      if (!aHasBeNo && !bHasBeNo) {
        if (dateA && dateB) {
          return dateA - dateB; // Sort in ascending order
        }

        // If only one has a valid vessel_berthing date, prioritize the one with the valid date
        if (dateA) return -1;
        if (dateB) return 1;

        // If neither has a valid vessel_berthing date, consider them equal
        return 0;
      }

      // 3rd priority: if be_no is present, sort based on earliest detention_from date among all containers
      if (aHasBeNo && bHasBeNo) {
        const earliestDetentionA = a.container_nos.reduce(
          (earliest, container) => {
            const detentionDate = parseDate(container.detention_from);
            return !earliest || (detentionDate && detentionDate < earliest)
              ? detentionDate
              : earliest;
          },
          null
        );

        const earliestDetentionB = b.container_nos.reduce(
          (earliest, container) => {
            const detentionDate = parseDate(container.detention_from);
            return !earliest || (detentionDate && detentionDate < earliest)
              ? detentionDate
              : earliest;
          },
          null
        );

        if (!earliestDetentionA && !earliestDetentionB) return 0;
        if (!earliestDetentionA) return 1;
        if (!earliestDetentionB) return -1;

        return earliestDetentionA - earliestDetentionB;
      }

      // If one has be_no and the other doesn't, prioritize the one with be_no
      if (aHasBeNo && !bHasBeNo) return 1;
      if (!aHasBeNo && bHasBeNo) return -1;

      return 0;
    });

    res.send(jobs);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
