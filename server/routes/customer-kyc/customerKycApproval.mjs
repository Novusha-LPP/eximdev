import express from "express";
import CustomerKycApproval from "../../model/customerKycModel.mjs";

const router = express.Router();

router.post("/api/customer-kyc-approval/:_id", async (req, res) => {
  const { approval, remarks, approved_by } = req.body;

  const { _id } = req.params;
  try {
    // Find the document by ID
    const data = await CustomerKycApproval.findOne({ _id });
    if (!data) {
      return res.status(404).send("Not found");
    }

    // Update the approval field
    data.approval = approval;

    // Conditionally update the approved_by field
    if (approval !== "Sent for revision") {
      data.approved_by = approved_by;
    }

    // Conditionally update the remarks field
    if (approval === "Approved") {
      data.remarks = ""; // Set remarks to an empty string
    } else {
      data.remarks = remarks;
    }

    // Save the updated document
    await data.save();

    res.send({ message: "KYC status updated successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while updating the KYC approval status");
  }
});

export default router;
