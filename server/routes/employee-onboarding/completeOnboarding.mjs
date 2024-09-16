import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/complete-onboarding", async (req, res) => {
  try {
    const {
      username,
      skill,
      company_policy_visited,
      introduction_with_md,
      employee_photo,
      resume,
      address_proof,
      nda,
    } = req.body;

    // Build the update object dynamically
    const updateFields = {};
    if (skill) updateFields.skill = skill;
    if (company_policy_visited)
      updateFields.company_policy_visited = company_policy_visited;
    if (introduction_with_md)
      updateFields.introduction_with_md = introduction_with_md;
    if (employee_photo) updateFields.employee_photo = employee_photo;
    if (resume) updateFields.resume = resume;
    if (address_proof) updateFields.address_proof = address_proof;
    if (nda) updateFields.nda = nda;

    // Find the user by username and update the specified fields
    const updatedUser = await UserModel.findOneAndUpdate(
      { username },
      { $set: updateFields },
      { new: true } // This option ensures the method returns the updated document
    );

    // If user is not found, send an error response
    if (!updatedUser) {
      return res.status(404).send("User not found");
    }

    // Send a success response
    res.send({ message: "Successfully completed onboarding" });
  } catch (error) {
    // Handle any errors
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
