import express from "express";
import bcrypt from "bcryptjs";
import UserModel from "../../model/userModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import verifyToken from "../../middleware/authMiddleware.mjs";
import { Resend } from "resend";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const router = express.Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const CLIENT_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_CLIENT_URI
    : process.env.NODE_ENV === "server"
      ? process.env.SERVER_CLIENT_URI
      : process.env.DEV_CLIENT_URI;

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || "onboarding@alvision.in";

router.post("/api/onboard-employee", verifyToken, (req, res, next) => {
  const role = String(req.user?.role || '').toUpperCase();
  const username = String(req.user?.username || '').toLowerCase();
  
  if (role === 'ADMIN' || req.user?.isAttendanceAllowedAdmin === true || username === 'afzal_ghanchi') {
    return next();
  }
  return res.status(403).json({ message: 'Insufficient permissions' });
}, auditMiddleware("User"), async (req, res) => {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      email,
      company,
      employment_type,
    } = req.body;

    // Validate required fields
    if (
      !first_name || typeof first_name !== "string" || !first_name.trim() ||
      !last_name || typeof last_name !== "string" || !last_name.trim() ||
      !email || typeof email !== "string" || !email.trim() ||
      !company || typeof company !== "string" || !company.trim() ||
      !employment_type || typeof employment_type !== "string" || !employment_type.trim()
    ) {
      return res.status(400).send({
        message: "First name, last name, email, company, and employment type are required fields.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).send({
        message: "Please provide a valid email address.",
      });
    }

    const trimmedFirstName = first_name.trim();
    const trimmedLastName = last_name.trim();
    const trimmedEmail = email.trim();
    const trimmedCompany = company.trim();
    const trimmedEmploymentType = employment_type.trim();

    // Generate username and password
    const username = `${trimmedFirstName.toLowerCase()}_${trimmedLastName.toLowerCase()}`;
    const password = crypto.randomBytes(8).toString("hex");

    const existingEmployee = await UserModel.findOne({ username });
    if (existingEmployee) {
      return res.status(200).send({
        message: `Employee with username: ${username} already exists. Please choose a different username.`,
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new UserModel({
      first_name: trimmedFirstName.toUpperCase(),
      middle_name: middle_name && typeof middle_name === "string" ? middle_name.trim().toUpperCase() : "",
      last_name: trimmedLastName.toUpperCase(),
      email: trimmedEmail,
      company: trimmedCompany.toUpperCase(),
      username,
      password: hashedPassword,
      modules: ["Employee KYC", "Employee Onboarding", "Attendance"],
      role: "User",
      employment_type: trimmedEmploymentType,
    });

    await newUser.save();

    const mailOptions = {
      from: DEFAULT_FROM,
      to: trimmedEmail,
      subject: `Welcome to the Team, ${trimmedFirstName.toUpperCase()}!`,
      html: `
        Dear ${trimmedFirstName.toUpperCase()},<br/><br/>
        Congratulations on your new role at ${trimmedCompany}!<br/><br/>
        We are pleased to have you join us and look forward to the positive impact you will bring to our team. Enclosed are your onboarding details and some resources to help you get started.<br/>
        <ul>
          <li>Username: ${username}</li>
          <li>Password: ${password}</li>
          <li>URL: ${CLIENT_URI}</li>
        </ul>
        Should you have any questions, please don't hesitate to ask.<br/><br/>
        Welcome aboard!<br/><br/>
        Warm regards,<br/>
        Shalini Arun<br/>
        HR & Admin<br/>
        Suraj Forwarders Private Limited<br/><br/>
        <img src="https://alvision-images.s3.ap-south-1.amazonaws.com/Shalini+Mam.jpg" alt="Email Signature" style="max-width:100%; height: auto;">
      `,
    };

    if (resend) {
      try {
        const { error } = await resend.emails.send(mailOptions);
        if (error) {
          console.error("Error sending onboarding email:", error);
        }
      } catch (emailError) {
        console.error("Error sending onboarding email:", emailError);
      }
    } else {
      console.warn("RESEND_API_KEY is not configured; skipping onboarding email");
    }
    res.status(201).send({ message: "User onboarded successfully" });
  } catch (error) {
    console.error("Error onboarding user:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;