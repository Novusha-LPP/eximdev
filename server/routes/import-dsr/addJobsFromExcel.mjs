import express from "express";
import JobModel from "../../model/jobModel.mjs";
import LastJobsDate from "../../model/jobsLastUpdatedOnModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
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
router.post("/api/jobs/add-job-all-In-bond", async (req, res) => {
  try {
    const jobs = await JobModel.find(
      { type_of_b_e: "In-Bond" },
      { job_no: 1, importer: 1, be_no: 1, be_date: 1, ooc_copies: 1, _id: 0 } // Fetch job_no, importer, be_no, be_date, ooc_copies
    );
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching In-Bond jobs:", error);
    res.status(500).json({ message: "Error fetching In-Bond jobs." });
  }
});

// Route to add a new job
router.post("/api/jobs/add-job-imp-man", 
  auditMiddleware('Job'),
  async (req, res) => {
  try {
    const { container_nos, importer, awb_bl_no, custom_house, year, job_date } = req.body;

    // ✅ Validate required fields
    if (!importer || !custom_house) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // ✅ Check for duplicate container numbers **only if container_nos is provided and not empty**
    if (container_nos && container_nos.length > 1) {
      const existingContainer = await JobModel.findOne({
        "container_nos.container_number": {
          $in: container_nos.map((c) => c.container_number),
        },
      });

      if (existingContainer) {
        return res.status(400).json({
          message: `Duplicate container number found: ${container_nos
            .map((c) => c.container_number)
            .join(", ")}`,
        });
      }
    }

    // ✅ Check for duplicate BL Number **only if awb_bl_no is provided**
    if (awb_bl_no && awb_bl_no.length > 0) {
      const existingBl = await JobModel.findOne({ awb_bl_no });

      if (existingBl) {
        return res.status(400).json({
          message: `Duplicate BL number found: ${awb_bl_no}`,
        });
      }
    }

    // ✅ Generate new job_no
    const lastJob = await JobModel.findOne({ year }, { job_no: 1 })
      .sort({ job_no: -1 })
      .exec();
    const numericJobNo = lastJob ? parseInt(lastJob.job_no, 10) : 0;
    const totalDigits = lastJob?.job_no?.length || 5;
    const newJobNo = (numericJobNo + 1).toString().padStart(totalDigits, "0");
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
  job_no: newJobNo,
  ...req.body,
  job_date: todayDate // ← This line sets job_date to "now" if not provided
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
});

router.post("/api/jobs/add-job", 
  auditMiddleware('Job'),
  async (req, res) => {
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
        vessel_berthing,
        gateway_igm_date,
        line_no,
        ie_code_no,
        container_nos, // Container data from Excel
        hss_name,
        total_inv_value,
      } = data;

      // Sanitize bill_date before using it
      const sanitizedBillDate =
        typeof bill_date === "string"
          ? bill_date
          : bill_date != null
          ? String(bill_date)
          : "";

      // Define the filter to find existing jobs
      const filter = { year, job_no };

      // Check if the job already exists in the database
      const existingJob = await JobModel.findOne(filter);
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
      
      // Only update lineNoUpdate if it's empty in the database
      if (
        line_no &&
        (!lineNoUpdate || lineNoUpdate.trim() === "")
      ) {
        lineNoUpdate = line_no;
      }
      
      // Only update iceCodeUpdate if provided
      if (ie_code_no) {
        iceCodeUpdate = ie_code_no;
      }

      if (existingJob) {
        // UPDATED LOGIC: Only update container_number and size, preserve ALL other fields
        let updatedContainers = [];

        if (container_nos && Array.isArray(container_nos) && container_nos.length > 0) {
          // Get container numbers from Excel and Database
          const excelContainerNumbers = container_nos.map(c => c.container_number).filter(Boolean);
          const dbContainerNumbers = existingJob.container_nos.map(c => c.container_number).filter(Boolean);

          // Check if container numbers are different
          const containerNumbersMatch = 
            excelContainerNumbers.length === dbContainerNumbers.length &&
            excelContainerNumbers.every((num, index) => num === dbContainerNumbers[index]);

          if (!containerNumbersMatch) {
            // Container numbers are different - Update ONLY container_number and size
            console.log(`Container mismatch detected for job ${job_no}. Updating container_number and size only.`);
            console.log('Excel containers:', excelContainerNumbers);
            console.log('Database containers:', dbContainerNumbers);
            
            // Map Excel containers to DB containers by index, preserving ALL existing fields
            updatedContainers = container_nos.map((excelContainer, index) => {
              const existingContainer = existingJob.container_nos[index];
              
              if (existingContainer) {
                // Keep ALL existing fields, only update container_number and size
                return {
                  ...existingContainer.toObject(), // Keep all existing fields
                  container_number: excelContainer.container_number || existingContainer.container_number,
                  size: excelContainer.size || existingContainer.size,
                };
              } else {
                // New container from Excel (if Excel has more containers than DB)
                return {
                  container_number: excelContainer.container_number || '',
                  size: excelContainer.size || '',
                  // All other fields will be empty/null for new containers
                  arrival_date: null,
                  detention_from: null,
                  container_rail_out_date: null,
                  by_road_movement_date: null,
                  delivery_date: null,
                  emptyContainerOffLoadDate: null,
                  // Add other default fields as needed
                };
              }
            });

            // If DB has more containers than Excel, keep the extra DB containers
            if (existingJob.container_nos.length > container_nos.length) {
              const remainingContainers = existingJob.container_nos
                .slice(container_nos.length)
                .map(c => c.toObject());
              updatedContainers.push(...remainingContainers);
            }
          } else {
            // Container numbers match - Update size only, keep ALL other fields
            console.log(`Container numbers match for job ${job_no}. Updating size only.`);
            
            updatedContainers = existingJob.container_nos.map((existingContainer) => {
              const matchingExcelContainer = container_nos.find(
                (c) => c.container_number === existingContainer.container_number
              );

              if (matchingExcelContainer) {
                // Keep ALL existing fields, only update size
                return {
                  ...existingContainer.toObject(),
                  size: matchingExcelContainer.size || existingContainer.size,
                };
              }
              
              // No matching Excel container - keep as is
              return existingContainer.toObject();
            });
          }
        } else {
          // No container data from Excel - keep ALL existing containers unchanged
          updatedContainers = existingJob.container_nos.map(c => c.toObject());
        }

        // Define the update to set new data
        const update = {
          $set: {
            ...data,
            vessel_berthing: vesselBerthingToUpdate,
            gateway_igm_date: gateway_igm_dateUpdate,
            line_no: lineNoUpdate,
            ie_code_no: iceCodeUpdate,
            container_nos: updatedContainers, // Use the updated containers
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

        // Create the bulk update operation
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
            vessel_berthing: vesselBerthingToUpdate,
            gateway_igm_date: gateway_igm_dateUpdate,
            status: computeStatus(sanitizedBillDate),
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

    // Execute the bulkWrite operation
    const result = await JobModel.bulkWrite(bulkOperations);
    
    console.log('Bulk write result:', {
      inserted: result.insertedCount || 0,
      updated: result.modifiedCount || 0,
      upserted: result.upsertedCount || 0
    });

    // Update the last jobs update date
    try {
      const existingDateDocument = await LastJobsDate.findOne();
      const date = new Date().toISOString();
      
      if (existingDateDocument) {
        existingDateDocument.date = date;
        await existingDateDocument.save();
      } else {
        const jobsLastUpdatedOn = new LastJobsDate({ date });
        await jobsLastUpdatedOn.save();
      }
    } catch (error) {
      console.error("Error updating the last jobs date:", error);
      return res.status(500).send("An error occurred while updating the date.");
    }

    res.status(200).json({ 
      message: "Jobs added/updated successfully",
      stats: {
        inserted: result.insertedCount || 0,
        updated: result.modifiedCount || 0,
        upserted: result.upsertedCount || 0
      }
    });
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
    // rail_out_date,
    gateway_igm_date,
    vessel_berthing,
    type_of_b_e,
    consignment_type,
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
  const anyContainer_rail_out_date = container_nos?.some((container) =>
    isValidDate(container.container_rail_out_date)
  );

  const emptyContainerOffLoadDate = container_nos?.
    every((container) =>
    isValidDate(container.emptyContainerOffLoadDate)
  );
  const delivery_date = container_nos ?.
    every((container) =>
    isValidDate(container.delivery_date)
  );

  const validOutOfChargeDate = isValidDate(out_of_charge);
  const validPcvDate = isValidDate(pcv_date);
  const validDischargeDate = isValidDate(discharge_date);
  const validGatewayIgmDate = isValidDate(gateway_igm_date);
  const validVesselBerthing = isValidDate(vessel_berthing);

  // Check if type_of_b_e or consignment_type is "Ex-Bond" or "LCL"
  const isExBondOrLCL = type_of_b_e === "Ex-Bond";

  if (
    be_no &&
    anyContainerArrivalDate &&
    validOutOfChargeDate &&
    (isExBondOrLCL ? delivery_date : emptyContainerOffLoadDate)
  ) {
    return "Billing Pending";
  } else if (be_no && anyContainerArrivalDate && validOutOfChargeDate) {
    return "Custom Clearance Completed";
  } else if (be_no && anyContainerArrivalDate && validPcvDate) {
    return "PCV Done, Duty Payment Pending";
  } else if (be_no && anyContainerArrivalDate) {
    return "BE Noted, Clearance Pending";
  } else if (!be_no && anyContainerArrivalDate) {
    return "Arrived, BE Note Pending";
  } else if (be_no) {
    return "BE Noted, Arrival Pending";
  } else if (anyContainer_rail_out_date) {
    return "Rail Out";
  } else if (validDischargeDate) {
    return "Discharged";
  } else if (validGatewayIgmDate) {
    return "Gateway IGM Filed";
  } else if (validVesselBerthing) {
    return "Estimated Time of Arrival";
  } else {
    return "ETA Date Pending"; // Fallback if no conditions are met
  }
}

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
