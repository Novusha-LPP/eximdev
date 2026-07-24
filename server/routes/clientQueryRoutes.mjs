import express from "express";
import multer from "multer";
import {
  createQuery,
  getClientQueries,
  getJobsQueryStatus,
  replyToClientQuery,
  resolveClientQuery,
  uploadQueryAttachment,
} from "../controllers/clientQueryController.mjs";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post("/", createQuery);
router.get("/", getClientQueries);
router.post("/jobs-status", getJobsQueryStatus);
router.put("/:id/reply", replyToClientQuery);
router.put("/:id/resolve", resolveClientQuery);
router.post("/upload-attachment", upload.single("file"), uploadQueryAttachment);

export default router;
