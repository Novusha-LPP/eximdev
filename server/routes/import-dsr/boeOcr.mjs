import express from "express";
import multer from "multer";
import logger from "../../logger.js";
import { harvestPartIIIDuties } from "../../services/notificationHarvestService.mjs";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const OCR_URL = process.env.BOE_OCR_URL || "http://3.108.244.38:8002/api/v1/upload";

router.post("/api/import-dsr/boe-ocr", upload.single("file"), async (req, res) => {
  try {
    let fileBlob = null;
    let fileName = "bill_of_entry.pdf";

    if (req.file) {
      // Direct file upload from client
      fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype || "application/pdf" });
      fileName = req.file.originalname || "bill_of_entry.pdf";
    } else if (req.body && req.body.fileUrl) {
      // S3 or remote file URL
      const fileUrl = String(req.body.fileUrl).trim();
      if (!fileUrl) {
        return res.status(400).json({ success: false, message: "Invalid or empty fileUrl provided" });
      }

      fileName = fileUrl.split("/").pop().split("?")[0] || "bill_of_entry.pdf";
      try {
        fileName = decodeURIComponent(fileName);
      } catch (e) {
        // use raw if decoding fails
      }

      const fetchRes = await fetch(fileUrl);
      if (!fetchRes.ok) {
        return res.status(400).json({
          success: false,
          message: `Failed to fetch document from storage: ${fetchRes.status} ${fetchRes.statusText}`
        });
      }

      const arrayBuffer = await fetchRes.arrayBuffer();
      fileBlob = new Blob([arrayBuffer], { type: "application/pdf" });
    } else {
      return res.status(400).json({
        success: false,
        message: "No file or fileUrl provided in request"
      });
    }

    // Forward to BOE OCR microservice
    const formData = new FormData();
    formData.append("file", fileBlob, fileName);

    const ocrRes = await fetch(OCR_URL, {
      method: "POST",
      body: formData,
      headers: {
        accept: "application/json"
      }
    });

    const ocrData = await ocrRes.json().catch(() => null);

    if (!ocrRes.ok) {
      logger.error("BOE OCR Service error response:", { status: ocrRes.status, data: ocrData });
      return res.status(ocrRes.status || 502).json({
        status: "error",
        message: ocrData?.message || ocrData?.detail || `BOE OCR Server responded with status ${ocrRes.status}`
      });
    }

    // Asynchronously harvest Part-III duties into Section B, C, D master directories
    if (ocrData && ocrData.status === "success" && ocrData.data?.PartIIIDuties) {
      harvestPartIIIDuties({
        partIIIDuties: ocrData.data.PartIIIDuties,
        jobNo: req.body?.jobNo || "",
        boeNo: ocrData.data?.be_no || req.body?.beNo || ""
      }).catch((err) => {
        logger.error("Background notification harvesting failed:", err);
      });
    }

    return res.json(ocrData);
  } catch (error) {
    logger.error("BOE OCR extraction error:", error);
    console.error("BOE OCR extraction error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal server error while processing BOE OCR"
    });
  }
});

export default router;
