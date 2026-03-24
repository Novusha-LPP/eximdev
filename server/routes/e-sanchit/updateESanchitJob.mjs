import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

router.patch("/api/update-esanchit-job/:branch_code/:trade_type/:mode/:job_no/:year",
  auditMiddleware('Job'),
  async (req, res) => {
    const { branch_code, trade_type, mode, job_no, year } = req.params;
    const { cth_documents, documents, queries, esanchitCharges, dsr_queries, esanchit_completed_date_time } = req.body;

    try {
      const matchingJob = await JobModel.findOne({ branch_code, trade_type, mode: mode.toUpperCase(), job_no, year });

      if (!matchingJob) {
        // Send a response indicating that the job does not exist
        return res.status(200).send({
          message: "Job not found",
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

      // Update esanchitCharges
      if (esanchitCharges && esanchitCharges.length > 0) {
        esanchitCharges.forEach((incomingDoc) => {
          const existingDocIndex = matchingJob.esanchitCharges.findIndex(
            (doc) => doc.document_name === incomingDoc.document_name
          );
          if (existingDocIndex !== -1) {
            // Update the existing document
            matchingJob.esanchitCharges[existingDocIndex] = {
              ...matchingJob.esanchitCharges[existingDocIndex],
              ...incomingDoc,
            };
          } else {
            // Add new document if it doesn't exist
            matchingJob.esanchitCharges.push(incomingDoc);
          }
        });
      }

      // Update queries
      if (queries) {
        matchingJob.eSachitQueries = queries;
      }

      if (dsr_queries) {
        matchingJob.dsr_queries = dsr_queries;
      }

      if (typeof esanchit_completed_date_time !== 'undefined') {
        matchingJob.esanchit_completed_date_time = esanchit_completed_date_time;
      }

      await matchingJob.save();
      res.send({ message: "Job updated successfully" });
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

export default router;
