import express from "express";
// JobModel is now attached to req by branchJobMiddleware

const router = express.Router();

router.post("/api/update-do-container", async (req, res) => {
  // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
  const JobModel = req.JobModel;

  const { job_no, year, container_number, do_validity_upto_container_level } =
    req.body;

  try {
    const job = await JobModel.findOne({ job_no, year });
    const index = job.container_nos.findIndex(
      (container) => container.container_number === container_number
    );

    job.container_nos[index].do_validity_upto_container_level =
      do_validity_upto_container_level;
    await job.save();
    res.status(200).json({ message: "Container DO validity updated successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

export default router;
