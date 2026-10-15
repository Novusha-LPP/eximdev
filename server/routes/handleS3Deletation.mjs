import express from "express";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import auditMiddleware from "../middleware/auditTrail.mjs";
import authMiddleware from "../middleware/authMiddleware.mjs";
import logger from "../logger.js";

const router = express.Router();


// Check for required environment variables first
if (!process.env.REACT_APP_ACCESS_KEY || !process.env.REACT_APP_SECRET_ACCESS_KEY || !process.env.REACT_APP_AWS_REGION) {
  throw new Error("Missing AWS credentials or region in environment variables.");
}

const s3 = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  },
});

router.post("/api/delete-s3-file", authMiddleware, auditMiddleware("S3File"), async (req, res) => {
  const rawKey = req.body.key;
  if (!rawKey) {
    return res.status(400).json({ message: "Missing file key" });
  }

  const key = decodeURIComponent(rawKey);

  const command = new DeleteObjectCommand({
    Bucket: process.env.REACT_APP_S3_BUCKET,
    Key: key,
  });

  try {
    await s3.send(command);
    res.status(200).json({ message: "File deleted successfully" });
  } catch (err) {
    logger.error(`S3 deletion error for key ${key}: ${err.message}`, { stack: err.stack, code: err.name });
    console.error("S3 deletion error:", err);
    res.status(500).json({
      message: "Error deleting file from S3",
      error: err.message,
      code: err.name,
    });
  }
});

export default router;
