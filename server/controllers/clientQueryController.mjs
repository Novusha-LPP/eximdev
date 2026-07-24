import ClientQuery from "../model/clientQueryModel.mjs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Helper: Get S3 Client
const getS3Client = () => {
  if (process.env.REACT_APP_ACCESS_KEY && process.env.REACT_APP_SECRET_ACCESS_KEY) {
    return new S3Client({
      region: process.env.REACT_APP_AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.REACT_APP_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
      },
    });
  }
  return null;
};

// Create a new Query (from admin or client)
export const createQuery = async (req, res) => {
  try {
    const { module_type, job_no, job_id, subject, message, client_name, senderType, attachments } = req.body;

    if (!job_no || !message) {
      return res.status(400).json({ success: false, message: "job_no and message are required" });
    }

    const newQuery = new ClientQuery({
      module_type: module_type || "import",
      job_no,
      job_id,
      client_name: client_name || (senderType === "client" ? "Client" : "Operations Team"),
      subject: subject || "Job Query",
      message,
      attachments: attachments || [],
      seenByClient: senderType !== "client" ? false : true,
      seenByAdmin: senderType === "client" ? false : true,
    });

    await newQuery.save();

    return res.status(201).json({
      success: true,
      message: "Query created successfully",
      query: newQuery,
    });
  } catch (error) {
    console.error("Error creating client query:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Fetch queries for a job or list
export const getClientQueries = async (req, res) => {
  try {
    const { job_no, status, module_type } = req.query;

    const filter = {};
    if (job_no) filter.job_no = job_no;
    if (status) filter.status = status;
    if (module_type) filter.module_type = module_type;

    const queries = await ClientQuery.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, queries });
  } catch (error) {
    console.error("Error fetching client queries:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Batch status for job list
export const getJobsQueryStatus = async (req, res) => {
  try {
    const { jobNos, isClient } = req.body;

    if (!Array.isArray(jobNos) || jobNos.length === 0) {
      return res.status(200).json({ success: true, data: {} });
    }

    const queries = await ClientQuery.find({ job_no: { $in: jobNos } }).lean();

    const statusMap = {};

    jobNos.forEach((jNo) => {
      statusMap[jNo] = {
        hasQueries: false,
        hasUnseen: false,
        hasOpenQueries: false,
        totalQueries: 0,
      };
    });

    queries.forEach((q) => {
      if (statusMap[q.job_no]) {
        statusMap[q.job_no].hasQueries = true;
        statusMap[q.job_no].totalQueries += 1;

        if (q.status === "open") {
          statusMap[q.job_no].hasOpenQueries = true;
        }

        const unseen = isClient ? !q.seenByClient : !q.seenByAdmin;
        if (unseen) {
          statusMap[q.job_no].hasUnseen = true;
        }
      }
    });

    return res.status(200).json({ success: true, data: statusMap });
  } catch (error) {
    console.error("Error fetching jobs query status:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Reply to a Query
export const replyToClientQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, repliedBy, email, username, senderType, attachments } = req.body;

    if (!message && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, message: "Reply message or attachment is required" });
    }

    const query = await ClientQuery.findById(id);
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    const replyObj = {
      message: message || "Attachment sent",
      repliedBy: repliedBy || "Operations Team",
      email: email || "",
      username: username || "",
      senderType: senderType || "admin",
      attachments: attachments || [],
      repliedAt: new Date(),
    };

    query.replies.push(replyObj);

    if (senderType === "client") {
      query.seenByAdmin = false;
      query.seenByClient = true;
    } else {
      query.seenByClient = false;
      query.seenByAdmin = true;
    }

    await query.save();

    return res.status(200).json({
      success: true,
      message: "Reply added successfully",
      query,
    });
  } catch (error) {
    console.error("Error replying to query:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Resolve Query
export const resolveClientQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNote } = req.body;

    const query = await ClientQuery.findById(id);
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    query.status = "resolved";
    query.resolvedBy = resolvedBy || "Admin";
    query.resolvedAt = new Date();
    query.resolutionNote = resolutionNote || "";

    await query.save();

    return res.status(200).json({
      success: true,
      message: "Query resolved successfully",
      query,
    });
  } catch (error) {
    console.error("Error resolving query:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Upload attachment
export const uploadQueryAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const file = req.file;
    const s3 = getS3Client();

    if (s3 && process.env.REACT_APP_BUCKET_NAME) {
      const key = `query-attachments/${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;

      const command = new PutObjectCommand({
        Bucket: process.env.REACT_APP_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3.send(command);

      const fileUrl = `https://${process.env.REACT_APP_BUCKET_NAME}.s3.${process.env.REACT_APP_AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;

      return res.status(200).json({
        success: true,
        fileUrl,
        fileName: file.originalname,
        fileType: file.mimetype,
      });
    }

    // Fallback: Data URI
    const base64 = file.buffer.toString("base64");
    const dataUrl = `data:${file.mimetype};base64,${base64}`;

    return res.status(200).json({
      success: true,
      fileUrl: dataUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
    });
  } catch (error) {
    console.error("Error uploading query attachment:", error);
    return res.status(500).json({ success: false, message: "Failed to upload attachment" });
  }
};
