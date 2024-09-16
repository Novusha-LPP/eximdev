import express from "express";
import JobModel from "../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-job-by-id/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const job = await JobModel.findOne({ _id });
    res.status(200).send(job);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;
