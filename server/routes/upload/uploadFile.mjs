import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import logger from "../../logger.js";

import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

// Configure Multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
  fileFilter: (req, file, cb) => {
    // Accept images, pdfs, excel files, and videos
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
      "application/vnd.ms-excel", // xls
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
      "application/msword", // doc
      "application/zip", // zip
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime", // mov
      "video/x-msvideo", // avi
      "video/x-matroska", // mkv
    ];

    // Also check extension as a fallback/additional check
    const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|xlsx|xls|docx|doc|zip|csv|mp4|webm|ogg|mov|avi|mkv)$/i;

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      file.originalname.match(allowedExtensions)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Unsupported file type. Allowed types: Images, PDF, Excel, Word, Zip, and Videos"),
        false
      );
    }
  },
});

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  },
});

router.post("/api/upload", authMiddleware, upload.array("files"), auditMiddleware("S3File"), async (req, res) => {
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

      const command = new PutObjectCommand({
        Bucket: process.env.REACT_APP_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3Client.send(command);
      uploadedFiles.push(`https://${process.env.REACT_APP_S3_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`);
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
