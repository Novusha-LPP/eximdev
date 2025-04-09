// routes/upload.mjs
import express from "express";
import AWS from "aws-sdk";

const router = express.Router();

// Configure AWS with credentials from environment variables
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

// Route to generate pre-signed URL
router.post("/get-upload-url", async (req, res) => {
  try {
    const { fileName, fileType, folderName } = req.body;

    if (!fileName || !fileType || !folderName) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    const timestamp = new Date().getTime();
    const key = `${folderName}/${timestamp}-${fileName}`;

    const s3Params = {
      Bucket: process.env.S3_BUCKET || "alvision-exim-images",
      Key: key,
      ContentType: fileType,
      Expires: 3600,
    };

    const uploadURL = s3.getSignedUrl("putObject", s3Params);

    return res.json({
      success: true,
      uploadURL,
      key,
    });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate upload URL",
    });
  }
});

export default router;
