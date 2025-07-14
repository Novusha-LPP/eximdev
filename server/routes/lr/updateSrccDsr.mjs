import express from "express";
import AWS from "aws-sdk";
import PrData from "../../model/srcc/pr.mjs";
import mongoose from "mongoose";

const router = express.Router();

// AWS SES configuration
AWS.config.update({
  region: process.env.REACT_APP_AWS_REGION,
  // credentials: {
  accessKeyId: process.env.REACT_APP_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
});

const ses = new AWS.SES();

const sendDetentionEmail = async (tr_no, days, reason, containerDetails) => {
  const emailParams = {
    Source: "atulnagose123@gmail.com",
    Destination: {
      ToAddresses: [
        "ceo@srcontainercarriers.com",
        "jeeyainamdar@gmail.com",
        "react@novusha.com",
        "punit@alluvium.in",
      ],
      // ToAddresses: [
      //   "atulnagose1499@gmail.com",
      //   "ceo@srcontainercarriers.com",
      //   "react@novusha.com",
      // ],
    },
    Message: {
      Subject: {
        Data: `Detention Intimation - ${containerDetails.container_number}`,
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2c3e50;">Dear Sir/Madam,</h2>
              
              <p>Please find the details of the detention container:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; width: 40%;"><strong>Consignor:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.consignor}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Consignee:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.consignee}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>LR Date:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.lrDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>LR No:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${tr_no}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Container No:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.container_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Type:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.type_of_vehicle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Seal No:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.seal_no}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>D.O Validity Date:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.do_validity}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Vehicle No:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.vehicle_no}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Container Loading:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.loadingLocation}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Container Offload:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.offloadLocation}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Cargo Destination:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.destination}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>S/LINE:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${containerDetails.shippingLine}</td>
                </tr>
                <tr style="background-color: #f8d7da;">
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Detention days:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${days}</td>
                </tr>
                <tr style="background-color: #f8d7da;">
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason of detention:</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${reason}</td>
                </tr>
              </table>
              
              <p>Regards,<br>SRCC</p>
              
              <div style="margin-top: 30px; font-size: 12px; color: #7f8c8d;">
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </div>
          `,
        },
      },
    },
  };

  await ses.sendEmail(emailParams).promise();
};

router.post("/api/update-srcc-dsr", async (req, res) => {
  const {
    tr_no,
    lr_completed,
    tracking_status,
    offloading_date_time,
    detention_days = 0,
    reason_of_detention = "",
    tipping = false,
    document_attachment,
  } = req.body;

  if (!tr_no) {
    return res.status(400).json({ message: "TR number is required" });
  }

  try {
    const updateFields = {};

    if (lr_completed !== undefined) {
      updateFields["lr_completed"] = lr_completed;
    }
    if (tracking_status !== undefined) {
      // Validate if tracking_status is a valid ObjectId
      if (tracking_status && mongoose.Types.ObjectId.isValid(tracking_status)) {
        updateFields["tracking_status"] = new mongoose.Types.ObjectId(
          tracking_status
        );
      } else if (tracking_status === null || tracking_status === "") {
        updateFields["tracking_status"] = null;
      }
    }

    if (offloading_date_time) {
      updateFields["offloading_date_time"] = new Date(offloading_date_time);
    }

    if (detention_days) {
      updateFields["detention_days"] = detention_days;
    }

    if (reason_of_detention) {
      updateFields["reason_of_detention"] = reason_of_detention;
    }

    if (tipping) {
      updateFields["tipping"] = tipping;
    }

    if (document_attachment) {
      if (typeof document_attachment === "string") {
        updateFields["document_attachment"] = [document_attachment];
      } else if (Array.isArray(document_attachment)) {
        updateFields["document_attachment"] = document_attachment;
      }
     
    }

    const oldData = await PrData.findOne({ "containers.tr_no": tr_no })
      .orFail()
      .select("containers");

    oldData.containers = oldData.containers.map((container) =>
      container.tr_no === tr_no
        ? { ...container.toObject(), ...updateFields }
        : container
    );

    await oldData.save();

    if (detention_days > 0) {
      const containerDetails =
        oldData.containers.find((container) => container.tr_no === tr_no) || {};

      await sendDetentionEmail(
        tr_no,
        detention_days,
        reason_of_detention,
        containerDetails
      );
    } else {
    }

    return res.json({
      data: {
        tr_no: tr_no || "",
        lr_completed: lr_completed || "",
        tracking_status: tracking_status || "",
        offloading_date_time: offloading_date_time || "",
        detention_days: detention_days || "",
        reason_of_detention: reason_of_detention || "",
        tipping: tipping || "",
        document_attachment: document_attachment || "",
      },
      message: "Updated successfully",
    });
  } catch (err) {
    console.error("Error during update process:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
