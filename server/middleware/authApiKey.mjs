import ApiKeyModel from "../model/apiKeyModel.mjs";
import logger from "../logger.js";
import mongoose from "mongoose";

/**
 * Middleware to authenticate requests using an API key in the 'x-api-key' header.
 */
const authApiKey = async (req, res, next) => {
  // Allow key in headers (standard) or query params (convenience)
  const rawKey = req.headers["x-api-key"] || req.query["api_key"] || req.query["x-api-key"];
  const apiKey = (rawKey || "").trim();

  if (!apiKey) {
    return res.status(401).json({ error: "API Key is required in 'x-api-key' header or as 'api_key' parameter." });
  }

  try {
    const keyDoc = await ApiKeyModel.findOne({ key: apiKey });

    if (!keyDoc) {
      return res.status(401).json({ error: "Invalid API Key." });
    }

    if (keyDoc.isActive === false) {
        return res.status(401).json({ error: "API Key is deactivated." });
    }

    // Update lastUsedAt in the background (non-blocking)
    ApiKeyModel.updateOne(
      { _id: keyDoc._id },
      { $set: { lastUsedAt: new Date() } }
    ).catch(err => console.error("Error updating API key lastUsedAt:", err));

    // Attach key info to request
    req.apiKey = keyDoc;
    
    next();
  } catch (error) {
    console.error("API Key Authentication Error:", error);
    res.status(500).json({ error: "Internal Server Error during API Key authentication." });
  }
};

export default authApiKey;
