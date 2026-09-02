import express from "express";
import UserModel from "../../model/userModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import verifyToken from "../../middleware/authMiddleware.mjs";

const router = express.Router();

router.post("/api/complete-kyc", verifyToken, auditMiddleware("User"), async (req, res) => {
  try {
    const { username } = req.body;

    // Find the user by username
    const user = await UserModel.findOne({ username, isActive: { $ne: false } });

    if (!user) {
      return res.status(404).send("User not found or inactive");
    }

    // Update the user with the rest of the data from req.body
    const updateData = { ...req.body };
    if (updateData.employee_code !== undefined && (!updateData.employee_code || (typeof updateData.employee_code === "string" && !updateData.employee_code.trim()))) {
      updateData.employee_code = undefined;
      user.employee_code = undefined;
    }
    Object.assign(user, updateData);
    if (updateData.employee_code === undefined) {
      user.employee_code = undefined;
    }
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
