import express from "express";
import ApiKeyModel from "../../model/apiKeyModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import crypto from "crypto";

const router = express.Router();

/**
 * Middleware to check if the user is an Admin.
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "Admin") {
    next();
  } else {
    res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }
};

/**
 * @api {get} /api/admin/api-keys List all API keys (Admin only)
 */
router.get("/api/admin/api-keys", authMiddleware, isAdmin, async (req, res) => {
  try {
    // Return keys but redact the full key string for listing (optional)
    // Here we return name, createdBy, createdAt, lastUsedAt etc.
    const keys = await ApiKeyModel.find().select("-key");
    res.status(200).json(keys);
  } catch (error) {
    console.error("Error listing API keys:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @api {post} /api/admin/api-keys Create a new API key (Admin only)
 */
router.post("/api/admin/api-keys", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Name is required for the API Key." });
    }

    // Generate a secure random 64-character hex string (32 bytes)
    const key = crypto.randomBytes(32).toString("hex");
    
    const newApiKey = new ApiKeyModel({
      key,
      name,
      createdBy: req.user.username || "Admin"
    });

    await newApiKey.save();

    // Return the full key ONLY ONCE upon creation
    res.status(201).json({ 
        message: "API Key created successfully. Please store it securely.",
        name: newApiKey.name,
        key: key 
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @api {delete} /api/admin/api-keys/:id Revoke/Delete an API key (Admin only)
 */
router.delete("/api/admin/api-keys/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedKey = await ApiKeyModel.findByIdAndDelete(id);

    if (!deletedKey) {
      return res.status(404).json({ error: "API Key not found." });
    }

    res.status(200).json({ message: "API Key revoked successfully." });
  } catch (error) {
    console.error("Error deleting API key:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
