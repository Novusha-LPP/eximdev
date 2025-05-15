import express from "express";
import JobModel from "../../model/jobModel.mjs";
import PrModel from "../../model/srcc/prModel.mjs";
import PrData from "../../model/srcc/pr.mjs";

const router = express.Router();


router.put("/api/update-job/:year/:jobNo", async (req, res) => {
  const { jobNo, year } = req.params;

  const {
    cth_documents,
    documents,
    container_nos,
    arrival_date,
    free_time,
    checked,
    do_validity_upto_job_level,
  } = req.body;

  function sanitizeContainerData(container) {
    // Create a copy to avoid mutating the original
    const sanitized = { ...container };
    
    // Handle weighment_slip_images specifically
    if (sanitized.weighment_slip_images) {
      // Ensure weighment_slip_images is an array of strings or simple objects
      sanitized.weighment_slip_images = sanitized.weighment_slip_images.map(image => {
        // If it's already a string, return as is
        if (typeof image === 'string') {
          return image;
        }
        // If it's an object with a url, just return the url as a string to simplify
        else if (image && image.url) {
          return image.url;
        }
        // Handle any other case
        return image;
      });
    }
    
    return sanitized;
  }
  
  function addDaysToDate(dateString, days) {
    var date = new Date(dateString);
    date.setDate(date.getDate() + days);
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  // Helper function to subtract one day from a date
  function subtractOneDay(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  try {
    // 1. Retrieve the matching job document
    const matchingJob = await JobModel.findOne({ year, job_no: jobNo });

    if (!matchingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    // 2. Determine the branch_code based on the custom_house field
    let branch_code;
    switch (matchingJob.custom_house) {
      case "ICD SANAND":
        branch_code = "SND";
        break;
      case "ICD KHODIYAR":
        branch_code = "KHD";
        break;
      case "HAZIRA":
        branch_code = "HZR";
        break;
      case "MUNDRA PORT":
        branch_code = "MND";
        break;
      case "ICD SACHANA":
        branch_code = "SCH";
        break;
      case "BARODA":
        branch_code = "BRD";
        break;
      case "AIRPORT":
        branch_code = "AIR";
        break;
      default:
        break;
    }

    // 3. Check if the transporter is "SRCC" in the request body
    if (req.body.container_nos) {
      const transporterContainers = req.body.container_nos.filter(
        (container) => container.transporter === "SRCC"
      );

      if (transporterContainers.length > 0) {
        // 4. Fetch the last document from PrModel and generate a 5-digit number
        const lastPr = await PrModel.findOne().sort({ _id: -1 });

        let lastPrNo;
        if (lastPr) {
          lastPrNo = parseInt(lastPr.pr_no) + 1;
        } else {
          lastPrNo = 1;
        }
        const paddedNo = lastPrNo.toString().padStart(5, "0");
        const fiveDigitNo = "0".repeat(5 - paddedNo.length) + paddedNo;

        // 5. Update the job model
        matchingJob.pr_no = `PR/${branch_code}/${fiveDigitNo}/${matchingJob.year}`;

        // 6. Create a new document in PrData collection
        const newPrData = new PrData({
          pr_date: new Date().toLocaleDateString("en-GB"),
          pr_no: matchingJob.pr_no,
          branch: matchingJob.custom_house,
          consignor: matchingJob.importer,
          consignee: matchingJob.importer,
          container_type: "",
          container_count: transporterContainers.length,
          gross_weight: matchingJob.gross_weight,
          type_of_vehicle: "",
          description: "",
          shipping_line: matchingJob.shipping_line_airline,
          container_loading: "",
          container_offloading: "",
          do_validity: matchingJob.do_validity,
          document_no: matchingJob.be_no,
          document_date: matchingJob.be_date,
          goods_pickup: "",
          goods_delivery: "",
          containers: transporterContainers,
        });

        // Save the new PrData document to the database
        await newPrData.save();

        const newPr = new PrModel({
          pr_no: fiveDigitNo,
        });

        // Save the new PrModel document to the database
        await newPr.save();
      }
    }

    // Step 6: Add remaining fields from req.body to matching job
    if (req.body.arrival_date && req.body.container_nos) {
      // If arrival_date is not empty and container_nos array exists
      req.body.container_nos.forEach((container) => {
        // Apply arrival date to each document in the container_nos array
        container.arrival_date = req.body.arrival_date;
      });
    }

    // Convert examinatinPlanning and doPlanning to boolean values
    const { examinationPlanning, doPlanning, do_revalidation, ...rest } =
      req.body;

    const updatedFields = {
      ...rest,
      examinationPlanning:
        typeof examinationPlanning === "string"
          ? examinationPlanning === "true"
          : !!examinationPlanning,
      doPlanning:
        typeof doPlanning === "string" ? doPlanning === "true" : !!doPlanning,
      do_revalidation:
        typeof do_revalidation === "string"
          ? do_revalidation === "true"
          : !!do_revalidation,
      containers_arrived_on_same_date: checked,
    };

    let shouldUpdateDoProcessed = false;

    if (req.body.container_nos && req.body.container_nos.length > 0) {
      req.body.container_nos.forEach((incomingContainer, index) => {
        const dbContainer = matchingJob.container_nos[index];

        if (dbContainer) {
          // Check if lengths of do_revalidation arrays are different
          if (
            dbContainer.do_revalidation.length !==
            incomingContainer.do_revalidation.length
          ) {
            shouldUpdateDoProcessed = true;
          }
          // Check if any do_revalidation_upto values differ
          for (let i = 0; i < dbContainer.do_revalidation.length; i++) {
            console.log(
              dbContainer.do_revalidation[i].do_revalidation_upto,
              incomingContainer.do_revalidation[i].do_revalidation_upto
            );
            if (
              dbContainer.do_revalidation[i].do_revalidation_upto !==
              incomingContainer.do_revalidation[i].do_revalidation_upto
            ) {
              shouldUpdateDoProcessed = true;
              break;
            }
          }
        }
      });
    }

    // Update do_completed based on the check
    if (shouldUpdateDoProcessed) {
      matchingJob.do_completed = "No";
    }

    Object.assign(matchingJob, updatedFields);
    if (checked) {
      matchingJob.container_nos = container_nos.map((container) => {
        const detentionDate =
          arrival_date === ""
            ? ""
            : addDaysToDate(arrival_date, parseInt(free_time));
        
        // Sanitize the container data
        const sanitizedContainer = sanitizeContainerData(container);
        
        return {
          ...sanitizedContainer,
          arrival_date: arrival_date,
          detention_from: detentionDate,
          do_validity_upto_container_level: subtractOneDay(detentionDate),
        };
      });
    } else {
      matchingJob.container_nos = container_nos.map((container) => {
        const detentionDate =
          container.arrival_date === ""
            ? ""
            : addDaysToDate(container.arrival_date, parseInt(free_time));
    
        // Sanitize the container data
        const sanitizedContainer = sanitizeContainerData(container);
        
        return {
          ...sanitizedContainer,
          arrival_date: container.arrival_date,
          detention_from: detentionDate,
          do_validity_upto_container_level: subtractOneDay(detentionDate),
        };
      });
    }

    if (cth_documents && cth_documents.length > 0) {
      cth_documents.forEach((incomingDoc) => {
        const existingDocIndex = matchingJob.cth_documents.findIndex(
          (doc) => doc.document_name === incomingDoc.document_name
        );
        if (existingDocIndex !== -1) {
          // Update the existing document
          matchingJob.cth_documents[existingDocIndex] = {
            ...matchingJob.cth_documents[existingDocIndex],
            ...incomingDoc,
          };
        } else {
          // Add new document if it doesn't exist
          matchingJob.cth_documents.push(incomingDoc);
        }
      });
    }

    // 3. Update documents
    if (documents && documents.length > 0) {
      documents.forEach((incomingDoc) => {
        const existingDocIndex = matchingJob.documents.findIndex(
          (doc) => doc.document_name === incomingDoc.document_name
        );
        if (existingDocIndex !== -1) {
          // Update the existing document
          matchingJob.documents[existingDocIndex] = {
            ...matchingJob.documents[existingDocIndex],
            ...incomingDoc,
          };
        } else {
          // Add new document if it doesn't exist
          matchingJob.documents.push(incomingDoc);
        }
      });
    }
    matchingJob.do_validity_upto_job_level = do_validity_upto_job_level;

    // Step 8: Save the updated job document
    await matchingJob.save();

    res.status(200).json(matchingJob);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
// PATCH route for updating only vessel_berthing and container arrival_date
router.patch("/api/update-job/fields/:year/:jobNo", async (req, res) => {
  const { year, jobNo } = req.params;
  const { vessel_berthing, arrival_date, container_index } = req.body;

  try {
    // Find the matching job document
    const matchingJob = await JobModel.findOne({ year, job_no: jobNo });

    if (!matchingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Update vessel_berthing if provided in the request body
    if (vessel_berthing) {
      matchingJob.vessel_berthing = vessel_berthing;
    }

    // Update container arrival_date if provided along with a valid container_index
    if (arrival_date && typeof container_index === "number") {
      if (matchingJob.container_nos[container_index]) {
        matchingJob.container_nos[container_index].arrival_date = arrival_date;
      } else {
        return res.status(400).json({ error: "Invalid container index" });
      }
    }

    // Save the updated document
    await matchingJob.save();

    res.status(200).json(matchingJob);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

export default router;
