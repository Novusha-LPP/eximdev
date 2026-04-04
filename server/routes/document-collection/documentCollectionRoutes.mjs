import express from "express";
import DocumentCollection from "../../model/documentCollectionModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// GET /api/document-requests/count/pending - Get count of all pending requests
router.get("/api/document-requests/count/pending", authMiddleware, async (req, res) => {
  try {
    const count = await DocumentCollection.countDocuments({
      status: { $in: ["Not Collected", "In Progress"] },
    });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching pending count", error: error.message });
  }
});
 
// GET /api/document-requests/field-users - Fetch users in "Field" department
router.get("/api/document-requests/field-users", authMiddleware, async (req, res) => {
  try {
    const users = await UserModel.find({
      department: { $regex: /^(Field|Feild)$/i },
      isActive: true,
    }).select("first_name last_name username");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching field users", error: error.message });
  }
});

// POST /api/document-requests - Create a new document request (from Import DSR)
router.post("/api/document-requests", authMiddleware, async (req, res) => {
  try {
    const {
      job_number,
      bl_no,
      importer_name,
      year,
      branch_code,
      request_type,
      requested_by_name,
      responsible_person,
      notes,
    } = req.body;

    const requested_by = req.user?.username || "";
    const final_name = requested_by_name || `${req.user?.first_name || ""} ${req.user?.last_name || ""}`.trim() || requested_by;

    const doc = new DocumentCollection({
      job_number,
      bl_no,
      importer_name,
      year,
      branch_code,
      request_type,
      requested_by,
      requested_by_name: final_name,
      responsible_person,
      notes,
    });

    await doc.save();
    res.status(201).json({ message: "Document request created", data: doc });
  } catch (error) {
    console.error("Error creating document request:", error);
    res
      .status(500)
      .json({ message: "Error creating document request", error: error.message });
  }
});

// GET /api/document-requests - All requests (Doc Admin view, with optional filters)
router.get("/api/document-requests", authMiddleware, async (req, res) => {
  try {
    const { status, request_type, branch_code, year, startDate, endDate, responsible_person } = req.query;
    const filter = {};
    if (status) {
      if (status.includes(",")) {
        filter.status = { $in: status.split(",") };
      } else {
        filter.status = status;
      }
    }
    if (request_type) filter.request_type = request_type;
    if (branch_code) filter.branch_code = branch_code;
    if (year) filter.year = year;
    if (responsible_person) filter.responsible_person = responsible_person;

    if (startDate || endDate) {
      filter.requested_at = {};
      if (startDate) filter.requested_at.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.requested_at.$lte = end;
      }
    }

    const requests = await DocumentCollection.find(filter).sort({
      requested_at: -1,
    });
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching document requests:", error);
    res
      .status(500)
      .json({ message: "Error fetching document requests", error: error.message });
  }
});

// GET /api/document-requests/my-requests - Requests by current user (requester view)
router.get(
  "/api/document-requests/my-requests",
  authMiddleware,
  async (req, res) => {
    try {
      const username = req.user?.username || "";
      const requests = await DocumentCollection.find({
        requested_by: username,
      }).sort({ requested_at: -1 });
      res.status(200).json(requests);
    } catch (error) {
      console.error("Error fetching my document requests:", error);
      res.status(500).json({
        message: "Error fetching my document requests",
        error: error.message,
      });
    }
  }
);

// GET /api/document-requests/job/:job_number - Requests for a specific job
router.get("/api/document-requests/job/:job_number", authMiddleware, async (req, res) => {
  try {
    const { job_number } = req.params;
    const requests = await DocumentCollection.find({ job_number }).sort({ requested_at: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching job document requests", error: error.message });
  }
});

// PATCH /api/document-requests/:id/status - Update status + proof images + person + notes
router.patch(
  "/api/document-requests/:id/status",
  authMiddleware,
  async (req, res) => {
    try {
      const { status, proof_image_urls, responsible_person, notes, updated_by_name } = req.body;
      const { id } = req.params;

      const update = {};
      if (status !== undefined) update.status = status;
      if (notes !== undefined) update.notes = notes;
      if (responsible_person !== undefined) update.responsible_person = responsible_person;
      if (proof_image_urls !== undefined) update.proof_image_urls = proof_image_urls;
      if (status === "Collected") update.collected_at = new Date();

      update.updated_by = req.user?.username || "";
      update.updated_by_name = updated_by_name || `${req.user?.first_name || ""} ${req.user?.last_name || ""}`.trim() || update.updated_by;

      const updated = await DocumentCollection.findByIdAndUpdate(id, { $set: update }, {
        new: true,
      });
      if (!updated) {
        return res.status(404).json({ message: "Request not found" });
      }
      res
        .status(200)
        .json({ message: "Status updated successfully", data: updated });
    } catch (error) {
      console.error("Error updating document request status:", error);
      res.status(500).json({
        message: "Error updating document request status",
        error: error.message,
      });
    }
  }
);

export default router;
