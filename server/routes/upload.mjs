import express from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import { authenticateJWT } from "../auth/auth.mjs";
import cors from "cors";

const router = express.Router();

// Initialize the S3 client with AWS SDK v3
const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  },
});

// Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB file size limit
  },
});

// Route for file upload using multer and S3
router.post(
  "/upload-files",
  cors({
    origin: [
      "http://eximdev.s3-website.ap-south-1.amazonaws.com",
      "http://eximit.s3-website.ap-south-1.amazonaws.com",
      "http://localhost:3000",
      "https://exim.alvision.in",
      "https://eximapi.alvision.in",
    ],
  }),
  authenticateJWT,
  upload.array("files", 10),
  async (req, res) => {
    try {
      // Check if files exist in request
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
      }

      const folderName = req.body.folderName || "uploads";

      const uploadResults = [];
      const uploadErrors = [];

      // Process each file
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        try {
          // Generate a timestamp and clean filename
          const timestamp = new Date().getTime();
          const fileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
          const key = `${folderName}/${timestamp}-${fileName}`;

          // Set up S3 upload parameters
          const params = {
            Bucket: process.env.REACT_APP_S3_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          };

          // Upload file to S3 using AWS SDK v3
          const command = new PutObjectCommand(params);
          const uploadResult = await s3Client.send(command);

          // Construct location URL since SDK v3 doesn't return it directly
          const location = `https://${process.env.REACT_APP_S3_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${key}`;

          uploadResults.push({
            originalName: file.originalname,
            key: key,
            location: location,
            size: file.size,
            mimeType: file.mimetype,
          });
        } catch (fileError) {
          uploadErrors.push({
            file: file.originalname,
            error: fileError.message,
          });
        }
      }

      // Return response with results
      return res.json({
        success: uploadResults.length > 0,
        message:
          uploadResults.length > 0
            ? `${uploadResults.length} files uploaded successfully`
            : "No files were uploaded successfully",
        uploaded: uploadResults,
        errors: uploadErrors,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to process file uploads",
        error: error.message,
      });
    }
  }
);

export default router;
