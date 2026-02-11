import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/complete-kyc", async (req, res) => {
  try {
    const { username } = req.body;

    // Find the user by username
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Update the user with the rest of the data from req.body
    Object.assign(user, req.body);
    user.kyc_approval = "Pending";
    const formattedDate = new Date().toISOString().split("T")[0];
    user.kyc_date = formattedDate;
    // Save the updated user document
    await user.save();

    res.send({ message: "Successfully completed KYC" });
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while updating the user data");
  }
});

export default router;
