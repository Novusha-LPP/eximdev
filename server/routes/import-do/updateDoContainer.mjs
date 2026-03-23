import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

router.post("/api/update-do-container", auditMiddleware("Job"), async (req, res) => {
  const { branch_code, trade_type, mode, job_no, year, container_number, do_validity_upto_container_level } =
    req.body;

  try {
    const job = await JobModel.findOne({ branch_code, trade_type, mode: mode?.toUpperCase(), job_no, year });
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
