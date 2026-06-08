import express from "express";
import UserModel from "../../model/userModel.mjs";
import verifyToken from "../../middleware/authMiddleware.mjs";
import requireRole from "../../middleware/requireRole.mjs";

const router = express.Router();

router.get("/api/view-onboardings", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const users = await UserModel.find(
      {},
      "username first_name middle_name last_name email company skill employee_photo resume address_proof nda"
    );
    res.send(users.reverse()); // Reverse the array to have the last item at the top
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "An error occurred while fetching users." });
  }
});

export default router;
