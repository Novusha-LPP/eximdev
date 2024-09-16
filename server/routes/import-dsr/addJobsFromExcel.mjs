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
        container_nos, // Assume container data is part of the incoming job data
      } = data;

      // Define the filter to find existing jobs
      const filter = { year, job_no };

      // Check if the job already exists in the database
      const existingJob = await JobModel.findOne(filter);
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

function computeStatus(billDate) {
  if (!billDate || billDate.trim() === "" || billDate === "--") {
    return "Pending";
  }
  return "Completed";
}

export default router;
