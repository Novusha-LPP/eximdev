import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import staleSaveGuard from "../../middleware/staleSaveGuard.mjs";
import fieldAllowList from "../../middleware/fieldAllowList.mjs";
import { determineDetailedStatus } from "../../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../../utils/statusColorMapper.mjs";
import AuthorizationRegistrationModel from "../../model/authorizationRegistrationModel.mjs";
import requireLoginForWrite from "../../middleware/requireLoginForWrite.mjs";

const router = express.Router();

// The job_no and year are already available in the URL params,
// so we just need to attach them to req.jobInfo for the audit middleware
const extractJobInfo = async (req, res, next) => {
  try {
    const { branch_code, trade_type, mode, year, job_no } = req.params;
    
    // Find the job to get its document ID
    const job = await JobModel.findOne({ branch_code, trade_type, mode: mode.toUpperCase(), job_no, year }).lean();
    if (job) {
      req.jobInfo = {
        documentId: job._id,
        job_no,
        year
      };
    } else {
      console.log(`❌ Could not find job: ${branch_code}/${trade_type}/${year}/${job_no}`);
    }
    next();
  } catch (error) {
    console.error('❌ Error extracting job info:', error);
    next(); // Continue even if extraction fails
  }
};

// Fields the Operations job page and the examination planning list send
const checkOperationsFields = fieldAllowList("update-operations-job", [
  "_id", "bg_expiry_date", "bg_number", "bond_expiry_date", "bond_number", "cfs_name", "completedOperation",
  "completed_operation_date", "concor_gate_pass_date", "concor_gate_pass_validate_up_to",
  "concor_invoice_and_receipt_copy", "container_images", "container_nos", "custodian_gate_pass",
  "delivery_chalan_file", "delivery_date", "documents_received_date", "documents_send_to_accounts",
  "documents_send_to_icd", "do_revalidation", "dsr_queries", "examination_date", "out_of_charge",
  "pcv_date", "weighment_slip_images",
]);

// Same job filter the handler uses
const guardStaleSave = staleSaveGuard((req) => {
  const { branch_code, trade_type, mode, year, job_no } = req.params;
  const query = { branch_code, trade_type, mode: mode.toUpperCase(), year, job_no };
  if (req.body._id) query._id = req.body._id;
  return query;
});

router.patch("/api/update-operations-job/:branch_code/:trade_type/:mode/:year/:job_no", requireLoginForWrite, guardStaleSave, checkOperationsFields, extractJobInfo, auditMiddleware("Job"), async (req, res) => {
  const { branch_code, trade_type, mode, year, job_no } = req.params;
  const updateData = req.body;

  try {
    // SECURITY CHECK: If container_nos is being updated, validate they belong to this job
    if (updateData.container_nos && Array.isArray(updateData.container_nos)) {
      const query = { branch_code, trade_type, mode: mode.toUpperCase(), year, job_no };
      if (updateData._id) {
        query._id = updateData._id;
      }
      const existingJob = await JobModel.findOne(query).select('container_nos');
      
      if (existingJob && existingJob.container_nos) {
        const existingContainerNumbers = new Set(
          existingJob.container_nos.map(c => c.container_number)
        );
        const incomingContainerNumbers = new Set(
          updateData.container_nos.map(c => c.container_number)
        );
        
        // Check if incoming containers don't match existing containers
        const hasInvalidContainers = Array.from(incomingContainerNumbers).some(
          containerNum => !existingContainerNumbers.has(containerNum)
        );
        
        if (hasInvalidContainers) {
          console.error('SECURITY ALERT: Cross-job container contamination detected!', {
            year,
            job_no,
            existingContainers: Array.from(existingContainerNumbers),
            incomingContainers: Array.from(incomingContainerNumbers)
          });
          
          return res.status(400).json({
            message: "Container validation failed: Submitted containers do not match job containers",
            error: "Data integrity violation detected"
          });
        }
      }

      // TARE WEIGHT VALIDATION: 20ft >= 2100 KG, 40ft >= 3600 KG (empty values acceptable)
      for (const container of updateData.container_nos) {
        const tare = container.tare_weight;
        if (tare !== undefined && tare !== null && String(tare).trim() !== "") {
          const tareNum = parseFloat(tare);
          const sizeStr = String(container.size || "").trim().toLowerCase();
          if (isNaN(tareNum)) {
            return res.status(400).json({
              message: `Invalid tare weight specified for container ${container.container_number || ""}`,
              error: "Validation error"
            });
          }
          if ((sizeStr.startsWith("20") || sizeStr.includes("20")) && tareNum < 2100) {
            return res.status(400).json({
              message: `Tare weight for 20 feet container (${container.container_number || ""}) cannot be less than 2100 KG`,
              error: "Validation error"
            });
          }
          if ((sizeStr.startsWith("40") || sizeStr.includes("40")) && tareNum < 3600) {
            return res.status(400).json({
              message: `Tare weight for 40 feet container (${container.container_number || ""}) cannot be less than 3600 KG`,
              error: "Validation error"
            });
          }
        }
      }
    }

    // Apply the requested update first
    const query = { branch_code, trade_type, mode: mode.toUpperCase(), year, job_no };
    if (updateData._id) {
       query._id = updateData._id;
       delete updateData._id;
    }
    await JobModel.findOneAndUpdate(query, { $set: updateData });

    // Fetch the updated job and recompute detailed_status server-side
    let job = await JobModel.findOne({ branch_code, trade_type, mode: mode.toUpperCase(), year, job_no }).lean();
    if (!job) {
      return res.status(200).send({ message: "Job not found" });
    }

    // Synchronize compliance/document tracking fields to DGFT AuthorizationRegistrationModel
    if (job.be_no || job.ie_code_no) {
      const authUpdate = {};
      const convertToDdMmYyyy = (dateStr) => {
        if (!dateStr || typeof dateStr !== "string") return dateStr;
        if (dateStr.includes("/")) return dateStr; // Already in DD/MM/YYYY
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const [yyyy, mm, dd] = parts;
          return `${dd}/${mm}/${yyyy}`;
        }
        return dateStr;
      };

      if (updateData.bg_number !== undefined) authUpdate.bg_number = updateData.bg_number;
      if (updateData.bg_expiry_date !== undefined) authUpdate.bg_expiry_date = convertToDdMmYyyy(updateData.bg_expiry_date);
      if (updateData.bond_number !== undefined) authUpdate.bond_number = updateData.bond_number;
      if (updateData.bond_expiry_date !== undefined) authUpdate.bond_expiry_date = convertToDdMmYyyy(updateData.bond_expiry_date);
      if (updateData.documents_received_date !== undefined) authUpdate.documents_received_date = convertToDdMmYyyy(updateData.documents_received_date);
      if (updateData.documents_send_to_icd !== undefined) authUpdate.documents_send_to_icd = convertToDdMmYyyy(updateData.documents_send_to_icd);
      if (updateData.documents_send_to_accounts !== undefined) authUpdate.documents_send_to_accounts = convertToDdMmYyyy(updateData.documents_send_to_accounts);

      if (Object.keys(authUpdate).length > 0) {
        let authRecord = null;
        if (job.be_no) {
          authRecord = await AuthorizationRegistrationModel.findOne({ "be_details.be_no": job.be_no });
        }

        if (authRecord) {
          await AuthorizationRegistrationModel.findByIdAndUpdate(authRecord._id, { $set: authUpdate });
          console.log(`✅ Synced operation job compliance fields to AuthorizationRegistration ${authRecord._id}`);
        }
      }
    }

    const recomputedStatus = determineDetailedStatus(job);
    if (recomputedStatus && recomputedStatus !== job.detailed_status) {
      job = await JobModel.findOneAndUpdate(
        { branch_code, trade_type, mode: mode.toUpperCase(), year, job_no },
        { $set: { detailed_status: recomputedStatus } },
        { new: true }
      ).lean();
    }

    res.status(200).send({
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "An error occurred while updating the job",
    });
  }
});

export default router;
