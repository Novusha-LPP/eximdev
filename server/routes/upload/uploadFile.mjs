import express from "express";
import multer from "multer";
import AWS from "aws-sdk";
import logger from "../../logger.js";

const router = express.Router();

// Configure Multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Accept images, pdfs, and excel files
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
      "application/vnd.ms-excel", // xls
    ];

    // Also check extension as a fallback/additional check
    const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|xlsx|xls)$/i;

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      file.originalname.match(allowedExtensions)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Unsupported file type. Allowed types: Images, PDF, Excel"),
        false
      );
    }
  },
});

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.REACT_APP_ACCESS_KEY,
  secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  region: process.env.REACT_APP_AWS_REGION || "ap-south-1",
});

router.post("/api/upload", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const bucketPath = req.body.bucketPath || "uploads"; // Default path if not provided

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const timestamp = Date.now();
      const originalName = file.originalname;
      // Extract extension safely
      const extensionMatch = originalName.match(/\.[0-9a-z]+$/i);
      const extension = extensionMatch ? extensionMatch[0] : "";
      const baseName = originalName.replace(extension, "");

      const uniqueFileName = `${baseName}-${timestamp}${extension}`;
      const key = `${bucketPath}/${uniqueFileName}`;

      const params = {
        Bucket: process.env.REACT_APP_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const data = await s3.upload(params).promise();
      uploadedFiles.push(data.Location);
    }

    res.status(200).json({ urls: uploadedFiles });
  } catch (error) {
    logger.error(`File upload error: ${error.message}`);
    res
      .status(500)
      .json({ error: "Failed to upload files", details: error.message });
  }
});

export default router;
