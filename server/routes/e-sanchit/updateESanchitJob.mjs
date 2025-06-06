import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.post("/api/update-esanchit-job", async (req, res) => {
  const { job_no, year, cth_documents, documents, eSachitQueries } = req.body;

  try {
    const matchingJob = await JobModel.findOne({ job_no, year });

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

    // Update eSachitQueries
    matchingJob.eSachitQueries = eSachitQueries;

    await matchingJob.save();
    res.send({ message: "Job updated successfully" });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

export default router;
