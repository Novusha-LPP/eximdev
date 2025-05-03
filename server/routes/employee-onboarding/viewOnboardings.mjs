import express from "express";
import UserModel from "../../model/userModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";
const router = express.Router();

//* GET ALL THE USERS
router.get("/api/view-onboardings",authenticateJWT, async (req, res) => {
  try {
    const users = await UserModel.find(
      {},
      "username first_name middle_name last_name email company skill employee_photo resume address_proof nda "
    );
    res.send(users.reverse()); // Reverse the array to have the last item at the top
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "An error occurred while fetching users." });
  }
});

//* GET USER FROM PARTICULAR ID
router.get("/api/view-onboarding/:id",authenticateJWT, async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate that the ID is a valid MongoDB ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send({ error: "Invalid user ID format" });
    }

    // Find the user by ID and select specific fields
    const user = await UserModel.findById(userId, {
      // Onboarding fields
      username: 1,
      first_name: 1,
      middle_name: 1,
      last_name: 1,
      email: 1,
      company: 1,
      employment_type: 1,
      skill: 1,
      company_policy_visited: 1,
      introduction_with_md: 1,
      employee_photo: 1,
      resume: 1,
      address_proof: 1,
      nda: 1,

      // KYC fields
      designation: 1,
      department: 1,
      joining_date: 1,
      date_of_birth: 1,
      permanent_address_line_1: 1,
      permanent_address_line_2: 1,
      permanent_address_city: 1,
      permanent_address_area: 1,
      permanent_address_state: 1,
      permanent_address_pincode: 1,
      communication_address_line_1: 1,
      communication_address_line_2: 1,
      communication_address_city: 1,
      communication_address_area: 1,
      communication_address_state: 1,
      communication_address_pincode: 1,
      personal_email: 1,
      official_email: 1,
      mobile: 1,
      emergency_contact: 1,
      emergency_contact_name: 1,
      blood_group: 1,
      highest_qualification: 1,
      aadhar_no: 1,
      aadhar_photo_front: 1,
      aadhar_photo_back: 1,
      pan_no: 1,
      pan_photo: 1,
      pf_no: 1,
      esic_no: 1,
      bank_account_no: 1,
      bank_name: 1,
      ifsc_code: 1,
      marital_status: 1,
      kyc_date: 1,
      kyc_approval: 1,
    });

    // If no user is found
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Send the user data
    res.send(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .send({ error: "An error occurred while fetching the user." });
  }
});

export default router;
