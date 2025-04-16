import express from "express";
import LastJobsDate from "../../model/jobsLastUpdatedOnModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-last-jobs-date",authenticateJWT, async (req, res) => {
  try {
    // Fetch the latest document based on the 'date' field
    const lastJobsDateDocument = await LastJobsDate.findOne(
      {},
      { _id: 0 }
    ).sort({
      date: -1,
    });

    if (!lastJobsDateDocument) {
      // Handle the case where no documents are found in the collection
      return res.status(200).json({ message: "No data found." });
    }

    // Extract the 'date' field from the document and send it as a response
    const lastJobsDate = lastJobsDateDocument.date;
    res.json({ lastJobsDate });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the data." });
  }
});

export default router;
