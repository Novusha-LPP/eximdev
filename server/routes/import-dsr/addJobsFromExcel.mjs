import express from "express";
import JobModel from "../../model/jobModel.mjs";
import LastJobsDate from "../../model/jobsLastUpdatedOnModel.mjs";

const router = express.Router();

router.post("/api/jobs/add-job", async (req, res) => {
  const jsonData = req.body;

  try {
    const bulkOperations = [];

    for (const data of jsonData) {
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
        vessel_berthing, // New value from Excel
        container_nos, // Assume container data is part of the incoming job data
      } = data;

      // Define the filter to find existing jobs
      const filter = { year, job_no };

      // Check if the job already exists in the database
      const existingJob = await JobModel.findOne(filter);
      let vesselBerthingToUpdate = existingJob?.vessel_berthing || "";

      // Only update vessel_berthing if it's empty in the database
      if (
        vessel_berthing && // Excel has a valid vessel_berthing date
        (!vesselBerthingToUpdate || vesselBerthingToUpdate.trim() === "")
      ) {
        vesselBerthingToUpdate = vessel_berthing;
      }

      if (existingJob) {
        // Logic to merge or update container sizes
        const updatedContainers = existingJob.container_nos.map(
          (existingContainer) => {
            const newContainerData = container_nos.find(
              (c) => c.container_number === existingContainer.container_number
            );

            return newContainerData
              ? { ...existingContainer.toObject(), size: newContainerData.size }
              : existingContainer;
          }
        );

        // Define the update to set new data, including "container_nos"
        const update = {
          $set: {
            ...data,
            vessel_berthing: vesselBerthingToUpdate, // Ensure correct update logic
            container_nos: updatedContainers,
            status:
              existingJob.status === "Completed"
                ? existingJob.status
                : computeStatus(bill_date),
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

        // Create the bulk update operation for upsert or update
        const bulkOperation = {
          updateOne: {
            filter,
            update,
            upsert: true,
          },
        };

        bulkOperations.push(bulkOperation);
      } else {
        // If job does not exist, add job with new data
        const update = {
          $set: {
            ...data,
            vessel_berthing: vesselBerthingToUpdate, // Ensure new jobs respect the logic
            status: computeStatus(bill_date),
          },
        };

        const bulkOperation = {
          updateOne: {
            filter,
            update,
            upsert: true,
          },
        };

        bulkOperations.push(bulkOperation);
      }
    }

    // Execute the bulkWrite operation to update or insert multiple jobs
    await JobModel.bulkWrite(bulkOperations);

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
      res.status(500).send("An error occurred while updating the date.");
    }

    res.status(200).json({ message: "Jobs added/updated successfully" });
  } catch (error) {
    console.error("Error handling job data:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

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

// Function to determine the detailed status based on the job data
function determineDetailedStatus(job) {
  const {
    be_no,
    container_nos,
    out_of_charge,
    pcv_date,
    discharge_date,
    gateway_igm_date,
    vessel_berthing,
    eta,
  } = job;

  // Validate date using a stricter check
  const isValidDate = (date) => {
    if (!date) return false;
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  };

  // Check if any container has an arrival date
  const anyContainerArrivalDate = container_nos?.some((container) =>
    isValidDate(container.arrival_date)
  );

  const validOutOfChargeDate = isValidDate(out_of_charge);
  const validPcvDate = isValidDate(pcv_date);
  const validDischargeDate = isValidDate(discharge_date);
  const validGatewayIgmDate = isValidDate(gateway_igm_date);
  const validVesselBerthing = isValidDate(vessel_berthing);

  if (be_no && anyContainerArrivalDate && validOutOfChargeDate) {
    // if (eta) {
    return "Custom Clearance Completed";
  } else if (be_no && anyContainerArrivalDate && validPcvDate) {
    return "PCV Done, Duty Payment Pending";
  } else if (be_no && anyContainerArrivalDate) {
    return "BE Noted, Clearance Pending";
  } else if (be_no) {
    return "BE Noted, Arrival Pending";
  } else if (validDischargeDate) {
    return "Discharged";
  } else if (validGatewayIgmDate) {
    return "Gateway IGM Filed";
  } else if (validVesselBerthing) {
    return "Estimated Time of Arrival";
  } else {
    return ""; // Fallback if no conditions are met
  }
}

function computeStatus(billDate) {
  if (!billDate || billDate.trim() === "" || billDate === "--") {
    return "Pending";
  }
  return "Completed";
}

export default router;
