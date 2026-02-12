import express from "express";
import CustomerKycApproval from "../../model/CustomerKyc/customerKycModel.mjs";

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

    // Update the approved_by field for approved KYCs
    if (approval === "Approved") {
      data.approved_by = approved_by;
      data.remarks = ""; // Clear remarks for approved KYCs
    } else if (approval === "Sent for revision") {
      data.remarks = remarks;
      // Don't update approved_by for revisions
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
