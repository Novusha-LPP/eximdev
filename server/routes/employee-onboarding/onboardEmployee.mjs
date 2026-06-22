import express from "express";
import bcrypt from "bcryptjs";
import UserModel from "../../model/userModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import { Resend } from "resend";
import dotenv from "dotenv";
import crypto from "crypto";

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

router.post("/api/onboard-employee", auditMiddleware("User"), async (req, res) => {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      email,
      company,
      employment_type,
    } = req.body;

    const username = `${first_name.toLowerCase()}_${last_name.toLowerCase()}`;
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
      first_name: first_name.toUpperCase(),
      middle_name: middle_name ? middle_name.toUpperCase() : "",
      last_name: last_name.toUpperCase(),
      email,
      company: company.toUpperCase(),
      username,
      password: hashedPassword,
      modules: ["Employee KYC", "Employee Onboarding", "Attendance"],
      role: "User",
      employment_type: employment_type,
    });

    await newUser.save();

    const mailOptions = {
      from: DEFAULT_FROM,
      to: email,
      subject: `Welcome to the Team, ${first_name.toUpperCase()}!`,
      html: `
        Dear ${first_name.toUpperCase()},<br/><br/>
        Congratulations on your new role at ${company}!<br/><br/>
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

    try {
      const { error } = await resend.emails.send(mailOptions);
      if (error) {
        console.error("Error sending onboarding email:", error);
      }
    } catch (emailError) {
      console.error("Error sending onboarding email:", emailError);
    }
    res.status(201).send({ message: "User onboarded successfully" });
  } catch (error) {
    console.error("Error onboarding user:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;