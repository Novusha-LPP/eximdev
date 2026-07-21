import express from "express";
import mongoose from "mongoose";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { sanitizeJobPayload } from "../../utils/modeLogic.mjs";
import { recalculateLicenseUtilizationForJob, validateLicenseUtilization, getUsdImportRate } from "../../services/licenseUtilizationService.mjs";
import { validateRodtepUtilization } from "../../services/rodtepService.mjs";

const getUnitForCurrency = (currencyCode) => {
  if (!currencyCode) return 1;
  const code = String(currencyCode).toUpperCase().trim();
  if (code === "JPY" || code === "KRW") return 100;
  return 1;
};

const router = express.Router();

async function runWithTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (error) {
    if (
      error.message && (
        error.message.includes("replica set") ||
        error.message.includes("does not support sessions") ||
        error.codeName === "NotAReplicaSet"
      )
    ) {
      console.warn("[Transaction] Falling back to non-transaction execution due to lack of Replica Set support.");
      return await fn(null);
    }
    throw error;
  } finally {
    session.endSession();
  }
}


router.put("/api/update-job/:branch_code/:trade_type/:mode/:year/:jobNo",
  authMiddleware,
  auditMiddleware('Job'),
  async (req, res) => {
    const { branch_code, trade_type, mode, jobNo, year } = req.params;

    const {
      cth_documents,
      documents,
      container_nos,
      arrival_date,
      free_time,
      checked,
      do_validity_upto_job_level,
    } = req.body;

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
      const updatedJob = await runWithTransaction(async (session) => {
        // 1. Retrieve the matching job document with branch specificity
        const matchingJob = await JobModel.findOne({ 
          branch_code: branch_code.toUpperCase(),
          trade_type: trade_type.toUpperCase(),
          mode: mode.toUpperCase(), 
          year, 
          job_no: jobNo 
        }).session(session);

        if (!matchingJob) {
          throw new Error("Job not found_404");
        }

        // --- Admin Lock Check ---
        const billNos = (matchingJob.bill_no || "").split(",");
        const hasInvoice = billNos.some(no => no && no.trim().length > 0);
        
        if (hasInvoice && req.user?.role !== 'Admin') {
          throw new Error("Job is locked as a bill has been generated. Please contact an Admin to make changes._403");
        }

        // ✅ HSS Validation
        const hssVal = req.body.hss !== undefined ? req.body.hss : matchingJob.hss;
        if (hssVal === "Yes") {
          const cifInr = parseFloat(req.body.cif_amount !== undefined ? req.body.cif_amount : (req.body.cifValue !== undefined ? req.body.cifValue : (matchingJob.cif_amount || matchingJob.cifValue))) || 0;
          const otherCharges = req.body.other_charges_details || matchingJob.other_charges_details || {};
          const addlCharge = otherCharges.addl_charge || {};
          const addlRate = parseFloat(addlCharge.rate) || 0;
          const addlAmount = parseFloat(addlCharge.amount) || 0;
          const addlExrate = parseFloat(addlCharge.exchange_rate) || 1;
          const addlAmountInr = (addlAmount * addlExrate) / getUnitForCurrency(addlCharge.currency);

          const invoiceDetails = req.body.invoice_details || matchingJob.invoice_details || [];
          let baseCifInr = 0;
          if (invoiceDetails && invoiceDetails.length > 0) {
            baseCifInr = invoiceDetails.reduce((sum, row) => {
              const pv = parseFloat(row.product_value) || 0;
              const pvEx = parseFloat(row.exchange_rate) || parseFloat(req.body.exrate || matchingJob.exrate) || 1;
              const fr = parseFloat(row.freight) || 0;
              const frEx = parseFloat(row.freight_exchange_rate) || parseFloat(req.body.exrate || matchingJob.exrate) || 1;
              const ins = parseFloat(row.insurance) || 0;
              const insEx = parseFloat(row.insurance_exchange_rate) || 1;
              const oth = parseFloat(row.other_charges) || 0;
              const othEx = parseFloat(row.other_charges_exchange_rate) || 1;
              
              const pvInr = (pv * pvEx) / getUnitForCurrency(row.inv_currency);
              const frInr = (fr * frEx) / getUnitForCurrency(row.freight_currency);
              const insInr = (ins * insEx) / getUnitForCurrency(row.insurance_currency);
              const othInr = (oth * othEx) / getUnitForCurrency(row.other_charges_currency);
              
              return sum + (pvInr + frInr + insInr + othInr);
            }, 0);
          } else {
            baseCifInr = cifInr - addlAmountInr;
          }
          if (baseCifInr < 0) baseCifInr = 0;

          const minAllowedAmountInr = baseCifInr * 0.02;

          if (addlRate > 0 && addlRate < 2) {
            throw new Error("High Sea Sale (HSS) is Yes. Additional Charge (High Sea) Rate % cannot be less than 2%._400");
          }
          if (addlAmountInr > 0 && baseCifInr > 0 && addlAmountInr < minAllowedAmountInr) {
            throw new Error(`High Sea Sale (HSS) is Yes. Additional Charge (High Sea) Amount (${addlAmountInr.toFixed(2)} INR) cannot be less than 2% of CIF (${minAllowedAmountInr.toFixed(2)} INR)._400`);
          }
          if (addlRate === 0 && addlAmount === 0) {
            throw new Error("High Sea Sale (HSS) is Yes. Additional Charge (High Sea) is required and must be minimum 2% of CIF._400");
          }
        }

        // ✅ Validate license utilization limits & check for duplicates before saving
        const usdRate = await getUsdImportRate();
        await validateLicenseUtilization(
          req.body.description_details,
          matchingJob._id,
          req.body.exrate || matchingJob.exrate || 84,
          usdRate,
          req.body.be_no || matchingJob.be_no || "",
          matchingJob.job_no || matchingJob.job_number || "",
          session
        );
        await validateRodtepUtilization(
          req.body.description_details,
          matchingJob._id,
          req.body.exrate || matchingJob.exrate || 84,
          session
        );

        // 2. Determine the derived branch code based on the custom_house field
        let derived_branch_code;
        switch (matchingJob.custom_house) {
          case "ICD SANAND":
            derived_branch_code = "SND";
            break;
          case "ICD KHODIYAR":
            derived_branch_code = "KHD";
            break;
          case "HAZIRA":
            derived_branch_code = "HZR";
            break;
          case "MUNDRA PORT":
            derived_branch_code = "MND";
            break;
          case "ICD SACHANA":
            derived_branch_code = "SCH";
            break;
          case "BARODA":
            derived_branch_code = "BRD";
            break;
          case "AIRPORT":
            derived_branch_code = "AIR";
            break;
          default:
            break;
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
              : do_revalidation !== undefined && do_revalidation !== null && do_revalidation !== ""
                ? !!do_revalidation
                : undefined,
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

        const sanitizedUpdate = sanitizeJobPayload(updatedFields);

        // ✅ Protect critical fields from being overwritten by empty/undefined values
        delete sanitizedUpdate.branch_code;
        delete sanitizedUpdate.job_number;
        delete sanitizedUpdate.branch_id;
        delete sanitizedUpdate.job_no;
        delete sanitizedUpdate.year;
        delete sanitizedUpdate.financial_year;
        delete sanitizedUpdate.cth_documents;
        delete sanitizedUpdate.documents;

        // ✅ Support legacy address formats (strings) by converting them to objects before assignment
        if (typeof sanitizedUpdate.importer_address === 'string') {
          sanitizedUpdate.importer_address = { details: sanitizedUpdate.importer_address };
        }
        if (typeof sanitizedUpdate.hss_address === 'string') {
          sanitizedUpdate.hss_address = { details: sanitizedUpdate.hss_address };
        }

        Object.assign(matchingJob, sanitizedUpdate);

        if (sanitizedUpdate.other_charges_details) {
          matchingJob.markModified('other_charges_details');
        }

        if (checked) {
          matchingJob.container_nos = container_nos.map((container) => {
            const detentionDate =
              arrival_date === ""
                ? ""
                : addDaysToDate(arrival_date, parseInt(free_time));
            return {
              ...container,
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

            return {
              ...container,
              arrival_date: container.arrival_date,
              detention_from: detentionDate,
              do_validity_upto_container_level: subtractOneDay(detentionDate),
            };
          });
        }

        if (Array.isArray(cth_documents)) {
          const incomingDocNames = cth_documents.map((doc) => doc.document_name);
          const docsToRemove = matchingJob.cth_documents.filter(
            (doc) => !incomingDocNames.includes(doc.document_name)
          );
          docsToRemove.forEach((doc) => {
            matchingJob.cth_documents.pull({ _id: doc._id });
          });

          cth_documents.forEach((incomingDoc) => {
            const existingDocIndex = matchingJob.cth_documents.findIndex(
              (doc) => doc.document_name === incomingDoc.document_name
            );
            if (existingDocIndex !== -1) {
              matchingJob.cth_documents[existingDocIndex].set(incomingDoc);
            } else {
              matchingJob.cth_documents.push(incomingDoc);
            }
          });
        }

        // 3. Update documents
        if (Array.isArray(documents)) {
          const incomingDocNames = documents.map((doc) => doc.document_name);
          const docsToRemove = matchingJob.documents.filter(
            (doc) => !incomingDocNames.includes(doc.document_name)
          );
          docsToRemove.forEach((doc) => {
            matchingJob.documents.pull({ _id: doc._id });
          });

          documents.forEach((incomingDoc) => {
            const existingDocIndex = matchingJob.documents.findIndex(
              (doc) => doc.document_name === incomingDoc.document_name
            );
            if (existingDocIndex !== -1) {
              matchingJob.documents[existingDocIndex].set(incomingDoc);
            } else {
              matchingJob.documents.push(incomingDoc);
            }
          });
        }
        matchingJob.do_validity_upto_job_level = do_validity_upto_job_level;
        // Step 8: Save the updated job document
        await matchingJob.save({ session });

        await recalculateLicenseUtilizationForJob(matchingJob, session);

        return matchingJob;
      });

      res.status(200).json(updatedJob);
      } catch (error) {
        console.error(error);
        if (error.message && error.message.includes("_404")) {
          return res.status(404).json({ error: "Job not found" });
        }
        if (error.message && error.message.includes("_403")) {
          return res.status(403).json({ error: error.message.replace("_403", "") });
        }
        if (error.message && error.message.includes("_400")) {
          return res.status(400).json({ error: error.message.replace("_400", "") });
        }
        // Return 400 for validation failures
        if (error.message && (
          error.message.includes("does not exist") ||
          error.message.includes("expired") ||
          error.message.includes("mismatch") ||
          error.message.includes("exceeded") ||
          error.message.includes("exceeds") ||
          error.message.includes("already utilized") ||
          error.message.includes("already utilized this license item") ||
          error.message.includes("High Sea Sale") ||
          error.message.includes("HSS")
        )) {
          return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || "Server error" });
      }
  });


// PATCH route for updating only vessel_berthing and container arrival_date
router.patch("/api/update-job/fields/:branch_code/:trade_type/:mode/:year/:jobNo",
  authMiddleware,
  auditMiddleware('Job'),
  async (req, res) => {
    const { branch_code, trade_type, mode, year, jobNo } = req.params;
    const { vessel_berthing, arrival_date, container_index } = req.body;

    try {
      // Find the matching job document with branch specificity
      const matchingJob = await JobModel.findOne({ 
        branch_code: branch_code.toUpperCase(),
        trade_type: trade_type.toUpperCase(),
        mode: mode.toUpperCase(), 
        year, 
        job_no: jobNo 
      });

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

      recalculateLicenseUtilizationForJob(matchingJob).catch((err) =>
        console.error("[PatchJobFields] License utilization recalc error:", err)
      );

      res.status(200).json(matchingJob);
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  });

// PUT route for admin to update any static job details
router.put("/api/admin/update-job-static/:branch_code/:trade_type/:mode/:year/:jobNo",
  authMiddleware,
  auditMiddleware('Job'),
  async (req, res) => {
    const { branch_code, trade_type, mode, year, jobNo } = req.params;
    const updateData = req.body;

    try {
      const updatedJob = await runWithTransaction(async (session) => {
        if (updateData.job_no && updateData.job_no !== jobNo) {
          // Check for duplicate job_no
          const existingJob = await JobModel.findOne({
            branch_code: branch_code.toUpperCase(),
            trade_type: trade_type.toUpperCase(),
            mode: mode.toUpperCase(),
            year,
            job_no: updateData.job_no,
          }).session(session);

          if (existingJob) {
            throw new Error("Job number already exists for this year._400");
          }
        }

        const matchingJob = await JobModel.findOne({ 
          branch_code: branch_code.toUpperCase(),
          trade_type: trade_type.toUpperCase(),
          mode: mode.toUpperCase(), 
          year, 
          job_no: jobNo 
        }).session(session);

        if (!matchingJob) {
          throw new Error("Job not found_404");
        }

        // ✅ Validate license utilization limits & check for duplicates before saving
        const usdRate = await getUsdImportRate();
        await validateLicenseUtilization(
          req.body.description_details,
          matchingJob._id,
          req.body.exrate || matchingJob.exrate || 84,
          usdRate,
          req.body.be_no || matchingJob.be_no || "",
          matchingJob.job_no || matchingJob.job_number || "",
          session
        );
        await validateRodtepUtilization(
          req.body.description_details,
          matchingJob._id,
          req.body.exrate || matchingJob.exrate || 84,
          session
        );

        // ✅ Support legacy address formats (strings) by converting them to objects before assignment
        if (typeof updateData.importer_address === 'string') {
          updateData.importer_address = { details: updateData.importer_address };
        }
        if (typeof updateData.hss_address === 'string') {
          updateData.hss_address = { details: updateData.hss_address };
        }

        // Allow editing anything
        if (updateData.bill_no !== undefined) {
          const cleaned = updateData.bill_no.split(",").map(no => no.trim()).filter(Boolean);
          updateData.bill_no = cleaned.length > 0 ? updateData.bill_no.trim() : "";
          if (updateData.bill_no === ",") updateData.bill_no = "";
        }
        if (updateData.bill_date !== undefined) {
          const cleanedDate = updateData.bill_date.split(",").map(d => d.trim()).filter(Boolean);
          updateData.bill_date = cleanedDate.length > 0 ? updateData.bill_date.trim() : "";
          if (updateData.bill_date === ",") updateData.bill_date = "";
        }
        if (updateData.bill_amount !== undefined) {
            const cleanedAmt = updateData.bill_amount.split(",").map(a => a.trim()).filter(Boolean);
            updateData.bill_amount = cleanedAmt.length > 0 ? updateData.bill_amount.trim() : "";
            if (updateData.bill_amount === ",") updateData.bill_amount = "";
        }

        Object.assign(matchingJob, updateData);

        if (updateData.other_charges_details) {
          matchingJob.markModified('other_charges_details');
        }

        // ✅ Enhanced Status Reset Logic
        const currentBillNo = (matchingJob.bill_no || "").trim();
        if (!currentBillNo || currentBillNo === "," || currentBillNo === "") {
          matchingJob.status = "Pending";
          matchingJob.bill_no = "";
          matchingJob.bill_date = "";
          matchingJob.bill_amount = "";
          matchingJob.agency_invoice_no = "";
          matchingJob.reimbursement_invoice_no = "";
        }

        await matchingJob.save({ session });

        await recalculateLicenseUtilizationForJob(matchingJob, session);

        return matchingJob;
      });

      res.status(200).json(updatedJob);
    } catch (error) {
      console.error(error);
      if (error.message && error.message.includes("_404")) {
        return res.status(404).json({ error: "Job not found" });
      }
      if (error.message && error.message.includes("_400")) {
        return res.status(400).json({ error: error.message.replace("_400", "") });
      }
      // Return 400 for validation failures
      if (error.message && (
        error.message.includes("does not exist") ||
        error.message.includes("expired") ||
        error.message.includes("mismatch") ||
        error.message.includes("exceeded") ||
        error.message.includes("exceeds") ||
        error.message.includes("already utilized") ||
        error.message.includes("already utilized this license item")
      )) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
