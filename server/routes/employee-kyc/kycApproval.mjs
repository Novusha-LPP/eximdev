import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/kyc-approval", async (req, res) => {
  const { username, kyc_approval } = req.body;

  try {
    // Find the user by username
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Update the kycApproval field
    user.kyc_approval = kyc_approval;

    // Save the updated user document
    await user.save();

    res.send({ message: "KYC status updated successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while updating the KYC approval status");
  }
});

export default router;
