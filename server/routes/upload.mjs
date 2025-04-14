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
// Route for file upload using multer and S3
router.post(
  "/upload-files",
  cors({ origin: "*" }),
  upload.array("files", 10),
  async (req, res) => {
    console.log("=== FILE UPLOAD REQUEST RECEIVED ===");
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
    console.log(`Files received: ${req.files?.length || 0}`);

    if (req.files && req.files.length > 0) {
      console.log(
        "Files details:",
        req.files.map((file) => ({
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          size: `${(file.size / 1024).toFixed(2)} KB`,
          buffer: `Buffer (${file.buffer.length} bytes)`,
        }))
      );
    }

    try {
      // Check if files exist in request
      if (!req.files || req.files.length === 0) {
        console.log("ERROR: No files uploaded");
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
      }

      const folderName = req.body.folderName || "uploads";
      console.log(`Using folder name: ${folderName}`);

      const uploadResults = [];
      const uploadErrors = [];

      // Process each file
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        console.log(
          `Processing file ${i + 1}/${req.files.length}: ${file.originalname}`
        );

        try {
          // Generate a timestamp and clean filename
          const timestamp = new Date().getTime();
          const fileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
          const key = `${folderName}/${timestamp}-${fileName}`;
          console.log(`Generated S3 key: ${key}`);

          // Set up S3 upload parameters
          const params = {
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          };
          console.log(
            `S3 upload params: ${JSON.stringify({
              Bucket: process.env.S3_BUCKET,
              Key: key,
              ContentType: file.mimetype,
              BodySize: `${(file.buffer.length / 1024).toFixed(2)} KB`,
            })}`
          );

          // Upload file to S3
          console.log(`Starting S3 upload for ${fileName}...`);
          const uploadResult = await s3.upload(params).promise();
          console.log(`S3 upload successful: ${JSON.stringify(uploadResult)}`);

          uploadResults.push({
            originalName: file.originalname,
            key: uploadResult.Key,
            location: uploadResult.Location,
            size: file.size,
            mimeType: file.mimetype,
          });
        } catch (fileError) {
          console.error(
            `ERROR uploading file ${file.originalname}:`,
            fileError
          );
          uploadErrors.push({
            file: file.originalname,
            error: fileError.message,
          });
        }
      }

      // Return response with results
      console.log(
        `Upload process complete. Success: ${uploadResults.length > 0}`
      );
      console.log(
        `Files uploaded: ${uploadResults.length}, Errors: ${uploadErrors.length}`
      );

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
      console.error("ERROR in upload process:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process file uploads",
        error: error.message,
      });
    }
  }
);

export default router;
