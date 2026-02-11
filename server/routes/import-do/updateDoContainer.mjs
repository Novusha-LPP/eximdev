import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.post("/api/update-do-container", async (req, res) => {
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
  } catch (err) {
    console.log(err);
  }
});

export default router;
