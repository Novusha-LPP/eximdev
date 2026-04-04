import ApiKeyModel from "../model/apiKeyModel.mjs";
import logger from "../logger.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/**
 * Middleware to authenticate requests using an API key in the 'x-api-key' header.
 */
const authApiKey = async (req, res, next) => {
  // Allow key in headers (standard) or query params (convenience)
  const rawKey = req.headers["x-api-key"] || req.query["api_key"] || req.query["x-api-key"];
  const apiKey = (rawKey || "").trim();

  // Check for a valid session first (internal user via web application)
  if (req.cookies && req.cookies.token) {
    try {
      const verified = jwt.verify(
        req.cookies.token,
        process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod"
      );
      req.user = verified;
      return next(); // Authenticated via session
    } catch (err) {
      // Token invalid, proceed to API key check
    }
  }

  if (!apiKey) {
    return res.status(401).json({ error: "API Key is required or user must be logged in." });
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
