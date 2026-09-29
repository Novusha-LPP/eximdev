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

    const updateFields = { approval };

    // Update the approved_by field for approved KYCs
    if (approval === "Approved" || approval === "Approved by HOD") {
      updateFields.approved_by = approved_by;
      const approvalDate = new Date();
      updateFields.approved_by_date = approvalDate;
      updateFields.approvedAt = approvalDate;
      updateFields.remarks = ""; // Clear remarks for approved KYCs
    } else if (approval === "Sent for revision") {
      updateFields.remarks = remarks || "";
      // Don't update approved_by for revisions
    }

    // Update the document without running strict schema validation
    const updated = await CustomerKycApproval.findByIdAndUpdate(
      _id,
      { $set: updateFields },
      { new: true, runValidators: false }
    );

    res.send({ message: "KYC status updated successfully", data: updated });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while updating the KYC approval status");
  }
});

export default router;
