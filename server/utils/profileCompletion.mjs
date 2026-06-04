import nodemailer from "nodemailer";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import dotenv from "dotenv";

dotenv.config();

// Initialize AWS SES client for nodemailer
const sesClient = new SESClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  },
});

const transporter = nodemailer.createTransport({
  SES: { ses: sesClient, aws: { SendRawEmailCommand } },
});

/**
 * Calculates profile completion percentage, missing fields, and access status.
 */
export function calculateProfileCompletion(user) {
  if (!user) {
    return {
      percentage: 0,
      missingMandatoryFields: [],
      missingBlockingFields: [],
      isBlocked: true,
      isReadOnly: false,
      hasCriticalMissing: true,
    };
  }

  const mandatoryFields = [
    {
      name: "Full Name",
      check: () => !!(user.first_name?.trim() && user.last_name?.trim()),
      isCritical: true,
    },
    {
      name: "Employee ID",
      check: () => !!user.employee_code?.trim(),
      isCritical: true,
    },
    {
      name: "Designation",
      check: () => !!user.designation?.trim(),
      isCritical: true,
    },
    {
      name: "Department",
      check: () => !!user.department?.trim(),
      isCritical: true,
    },
    {
      name: "Reporting Manager",
      check: () => !!user.hod_id,
      isCritical: true,
    },
    {
      name: "Date of Joining",
      check: () => !!(user.date_of_joining || user.joining_date),
      isCritical: false,
    },
    {
      name: "Employment Type",
      check: () => !!user.employment_type?.trim(),
      isCritical: false,
    },
    {
      name: "Contact Number",
      check: () => !!user.mobile?.trim(),
      isCritical: true,
    },
    {
      name: "Official Email",
      check: () => !!(user.official_email?.trim() || user.email?.trim()),
      isCritical: true,
    },
    {
      name: "Skills (Primary)",
      check: () => !!user.skill?.trim(),
      isCritical: false,
    },
    {
      name: "Profile Photo",
      check: () => !!user.employee_photo?.trim(),
      isCritical: false,
    },
    {
      name: "Emergency Contact",
      check: () => !!user.emergency_contact?.trim(),
      isCritical: false,
    },
    {
      name: "Documents Uploaded",
      check: () => !!(user.aadhar_photo_front?.trim() && user.aadhar_photo_back?.trim() && user.pan_photo?.trim()),
      isCritical: true,
    },
  ];

  const missingMandatoryFields = [];
  const missingBlockingFields = [];
  let filledCount = 0;

  mandatoryFields.forEach((field) => {
    const isFilled = field.check();
    if (isFilled) {
      filledCount++;
    } else {
      missingMandatoryFields.push(field.name);
      if (field.isCritical) {
        missingBlockingFields.push(field.name);
      }
    }
  });

  const totalMandatory = mandatoryFields.length;
  const percentage = Math.round((filledCount / totalMandatory) * 100);

  // Access Restriction:
  // - percentage < 70% -> isBlocked: true (requires redirect, locks other modules)
  // - percentage >= 70% && percentage < 100% -> isReadOnly: true (write permissions restricted)
  const isBlocked = percentage < 70;
  const isReadOnly = percentage >= 70 && percentage < 100;
  const hasCriticalMissing = missingBlockingFields.length > 0;

  return {
    percentage,
    missingMandatoryFields,
    missingBlockingFields,
    isBlocked,
    isReadOnly,
    hasCriticalMissing,
  };
}

/**
 * Notifies the direct manager about the employee's missing critical profile fields.
 */
export async function sendManagerNotification(employee, managerEmail, missingFields) {
  const mailOptions = {
    from: "connect@surajgroupofcompanies.com",
    to: managerEmail,
    subject: `[Action Required] Profile Incomplete: ${employee.first_name} ${employee.last_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #c53030;">AlVision Exim - Profile Incomplete Alert</h2>
        <p>Dear HOD / Manager,</p>
        <p>This is an automated notification that your direct report, <b>${employee.first_name} ${employee.last_name} (${employee.employee_code || employee.username})</b>, has an incomplete profile in AlVision Exim.</p>
        <p>Because critical fields are missing, their system access is currently limited.</p>
        <div style="background: #fffaf0; border-left: 4px solid #dd6b20; padding: 15px; margin: 15px 0;">
          <h4 style="margin-top: 0; color: #dd6b20;">Missing Critical Fields:</h4>
          <ul>
            ${missingFields.map((f) => `<li>${f}</li>`).join("")}
          </ul>
        </div>
        <p>Please follow up with the employee and ensure they complete their profile details in the <b>Employee KYC</b> section as soon as possible.</p>
        <br/>
        <p>Warm regards,</p>
        <p><b>AlVision HR System</b></p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Notifies the employee about their missing profile fields and impending/current restrictions.
 */
export async function sendEmployeeNotification(employee, missingFields, percentage) {
  const mailOptions = {
    from: "connect@surajgroupofcompanies.com",
    to: employee.email || employee.official_email,
    subject: `[Action Required] Complete Your AlVision Profile (${percentage}% Complete)`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2b6cb0;">Complete Your AlVision Profile</h2>
        <p>Dear ${employee.first_name},</p>
        <p>Every employee is required to maintain a complete, accurate, and up-to-date profile. Your profile is currently <b>${percentage}% complete</b>.</p>
        <p>To restore or maintain full access to all AlVision modules, please complete the missing fields listed below:</p>
        <div style="background: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; margin: 15px 0;">
          <h4 style="margin-top: 0; color: #2b6cb0;">Missing Mandatory Fields:</h4>
          <ul>
            ${missingFields.map((f) => `<li>${f}</li>`).join("")}
          </ul>
        </div>
        <p>Please log in and update your details in the <b>Employee KYC</b> section.</p>
        <p><i>Note: Profile completion below 70% locks all standard modules, and 70%-99% completion restricts write access to read-only.</i></p>
        <br/>
        <p>Warm regards,</p>
        <p><b>HR & Admin Team</b></p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
