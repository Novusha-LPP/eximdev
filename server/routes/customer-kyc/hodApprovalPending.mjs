import express from "express";
import CustomerKycModel from "../../model/customerKycModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/hod-approval-pending",authenticateJWT, async (req, res) => {
  try {
    const data = await CustomerKycModel.find({ approval: "Pending" }).select(
      "_id name_of_individual category status iec_no approval approved_by remarks"
    );
    res.status(200).json(data);
  } catch (err) {
    console.log(err);
  }
});

export default router;
