import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/:year/jobs/:status/:detailedStatus", async (req, res) => {
  try {
    const { year, status, detailedStatus } = req.params;

    // Create a query object with year
    const query = {
      year,
    };

    if (status === "Cancelled") {
      // Include jobs where be_no is "CANCELLED" if the status is "cancelled"
      query.$or = [
        { status: "Cancelled" },
        { status: "Pending", be_no: "CANCELLED" },
        { status: "Completed", be_no: "CANCELLED" },
        { be_no: "CANCELLED" },
      ];
    } else {
      // Exclude jobs where be_no is "CANCELLED" for other statuses
      query.be_no = { $ne: "CANCELLED" };
      query.status = status;
    }

    // Match the detailed status stored in db
    if (detailedStatus !== "all") {
      if (detailedStatus === "estimated_time_of_arrival") {
        query.detailed_status = "Estimated Time of Arrival";
      } else if (detailedStatus === "discharged") {
        query.detailed_status = "Discharged";
      } else if (detailedStatus === "gateway_igm_filed") {
        query.detailed_status = "Gateway IGM Filed";
      } else if (detailedStatus === "be_noted_arrival_pending") {
        query.detailed_status = "BE Noted, Arrival Pending";
      } else if (detailedStatus === "be_noted_clearance_pending") {
        query.detailed_status = "BE Noted, Clearance Pending";
      } else if (detailedStatus === "custom_clearance_completed") {
        query.detailed_status = "Custom Clearance Completed";
      }
    }

    // Query the database and select relevant fields for sorting
    let jobs;

    if (detailedStatus === "all") {
      jobs = await JobModel.find(query).select(
        "job_no year importer custom_house awb_bl_no container_nos vessel_berthing detailed_status be_no be_date loading_port port_of_reporting type_of_b_e consignment_type consignment_type"
      );
    } else if (detailedStatus === "estimated_time_of_arrival") {
      jobs = await JobModel.find(query).select(
        "job_no year importer custom_house awb_bl_no container_nos vessel_berthing detailed_status be_no be_date loading_port port_of_reporting type_of_b_e consignment_type"
      );
    } else if (detailedStatus === "discharged") {
      jobs = await JobModel.find(query).select(
        "job_no year importer custom_house awb_bl_no container_nos vessel_berthing discharge_date  detailed_status be_no be_date loading_port port_of_reporting type_of_b_e consignment_type"
      );
    } else if (detailedStatus === "gateway_igm_filed") {
      jobs = await JobModel.find(query).select(
        "job_no year importer custom_house awb_bl_no container_nos vessel_berthing detailed_status be_no be_date loading_port port_of_reporting type_of_b_e consignment_type"
      );
    } else if (detailedStatus === "be_noted_arrival_pending") {
      jobs = await JobModel.find(query).select(
        "job_no year importer custom_house be_no be_date container_nos vessel_berthing detailed_status be_no be_date loading_port port_of_reporting type_of_b_e consignment_type"
      );
    } else if (detailedStatus === "be_noted_clearance_pending") {
      jobs = await JobModel.find(query).select(
        "job_no year importer custom_house be_no be_date container_nos vessel_berthing detailed_status be_no be_date loading_port port_of_reporting type_of_b_e consignment_type"
      );
    } else if (detailedStatus === "custom_clearance_completed") {
      jobs = await JobModel.find(query).select(
        "job_no year importer custom_house be_no be_date container_nos vessel_berthing out_of_charge detailed_status be_no be_date loading_port port_of_reporting type_of_b_e consignment_type"
      );
    } else {
      jobs = await JobModel.find(query).select(
        "job_no year importer custom_house awb_bl_no container_nos vessel_berthing detailed_status be_no be_date "
      );
    }

    // Apply the provided sorting logic to the jobs array
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

    // Calculate the total count of matching documents
    const total = jobs.length;

    res.json({ data: jobs, total });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
