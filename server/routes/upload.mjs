import express from "express";
import AWS from "aws-sdk";
import multer from "multer";
import cors from "cors";

const router = express.Router();

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
});

// Route for file upload using multer and S3
router.post(
  "/upload-files",
  cors({ origin: "*" }),
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
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          };

          // Upload file to S3
          const uploadResult = await s3.upload(params).promise();

          uploadResults.push({
            originalName: file.originalname,
            key: uploadResult.Key,
            location: uploadResult.Location,
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
