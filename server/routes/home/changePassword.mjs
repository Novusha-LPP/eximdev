import express from "express";
import bcrypt from "bcrypt";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/change-password", async (req, res) => {
  const { username, current_password, new_password } = req.body;

  try {
    // Retrieve the user by username
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided current password with the stored hashed password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(200).json({ message: "Current password is incorrect" });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    // Update the user's password in the database
    user.password = hashedNewPassword;
    await user.save();

    // Send a success response
    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
