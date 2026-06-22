import express from "express";
import bcrypt from "bcryptjs";
import UserModel from "../../model/userModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const CLIENT_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_CLIENT_URI
    : process.env.NODE_ENV === "server"
      ? process.env.SERVER_CLIENT_URI
      : process.env.DEV_CLIENT_URI;

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || "onboarding@alvision.in";

router.post("/api/change-password", auditMiddleware("User"), async (req, res) => {
  const { username, current_password, new_password } = req.body;

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(200).json({ message: "Current password is incorrect" });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    user.password = hashedNewPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/api/admin/change-password", auditMiddleware("User"), async (req, res) => {
  const { username, newPassword, adminUsername } = req.body;

  try {
    const adminUser = await UserModel.findOne({ username: adminUsername });
    const allowedRoles = ["Admin", "Head_of_Department"];

    if (!adminUser || !allowedRoles.includes(adminUser.role)) {
      return res.status(403).json({ message: "Unauthorized. Admin or HOD privileges required." });
    }

    const targetUser = await UserModel.findOne({ username });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isDevelopment = ["development", "server"].includes(process.env.NODE_ENV);
    if (targetUser.role === "Admin" && adminUser.username !== targetUser.username && !isDevelopment) {
      return res.status(403).json({ message: "Admin cannot change another admin's password" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    targetUser.password = hashedNewPassword;
    targetUser.passwordChangedAt = new Date(0);
    await targetUser.save();

    res.status(200).json({ message: "Password changed successfully" });

    if (targetUser.email) {
      const mailOptions = {
        from: DEFAULT_FROM,
        to: targetUser.email,
        subject: "Your Password Has Been Changed",
        html: `
          Dear ${targetUser.first_name || targetUser.username},<br/><br/>
          Your account password has been reset by ${adminUser.first_name || adminUser.username}.<br/><br/>
          Your new login credentials are:<br/>
          <ul>
            <li>Username: ${targetUser.username}</li>
            <li>Password: ${newPassword}</li>
            <li>URL: ${CLIENT_URI}</li>
          </ul>
          Please login and change your password after logging in.<br/><br/>
          Thank you,<br/>
          Admin Team<br/>
          Suraj Forwarders Private Limited<br/><br/>
          <img src="https://alvision-images.s3.ap-south-1.amazonaws.com/Shalini+Mam.jpg" alt="Email Signature" style="max-width:100%; height: auto;">
        `,
      };

      const { error } = await resend.emails.send(mailOptions);
      if (error) {
        console.error("Failed to send password change email:", error.message);
      }
    } else {
      console.warn("No email available for user:", targetUser.username);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;