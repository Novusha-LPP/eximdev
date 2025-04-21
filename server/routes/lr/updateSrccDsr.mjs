import express from "express";
import PrData from "../../model/srcc/pr.mjs";
import AWS from "aws-sdk";

const router = express.Router();

// AWS SES configuration
AWS.config.update({
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const ses = new AWS.SES();

const sendDetentionEmail = async (tr_no, days, reason) => {
  const emailParams = {
    Source: "noreply@srcontainercarriers.com",
    Destination: {
      ToAddresses: [
        "accounts@srcontainercarriers.com",
        "operations@srcontainercarriers.com",
      ],
    },
    Message: {
      Subject: { Data: "Detention Intimation" },
      Body: {
        Text: {
          Data: `Detention Alert:\n\nTR No: ${tr_no}\nDetention Days: ${days}\nReason: ${reason}`,
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
    offloading_date_time,
    detention_days = 0,
    reason_of_detention = "",
    tipping = false,
    document_attachment,
  } = req.body;
  console.log(req.body);

  if (!tr_no) {
    return res.status(400).json({ message: "TR number is required" });
  }

  try {
    const updateFields = {};

    if (lr_completed !== undefined) {
      updateFields["lr_completed"] = lr_completed;
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

    // Find the document
    const oldData = await PrData.findOne({ "containers.tr_no": tr_no })
      .orFail()
      .select("containers");

    // Update the specific container inside containers array
    oldData.containers = oldData.containers.map((container) =>
      container.tr_no === tr_no
        ? { ...container.toObject(), ...updateFields }
        : container
    );

    await oldData.save();

    // Send email if detention_days > 0
    if (detention_days > 0) {
      await sendDetentionEmail(tr_no, detention_days, reason_of_detention);
    }

    return res.json({
      data: oldData.toJSON(),
      message: "Updated successfully",
    });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
