import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.patch("/api/update-operations-job/:year/:job_no", async (req, res) => {
  const { year, job_no } = req.params;
  const updateData = req.body;

  try {
    const job = await JobModel.findOneAndUpdate(
      { year, job_no },
      { $set: updateData }, // $set is used to update only the fields provided
      {
        new: true,
        runValidators: true,
      }
    );

    if (!job) {
      return res.status(200).send({ message: "Job not found" });
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
