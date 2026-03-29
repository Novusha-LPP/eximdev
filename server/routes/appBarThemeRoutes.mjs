import express from "express";
import AppBarTheme from "../model/AppBarTheme.mjs";
import { JSDOM } from "jsdom";
import DOMPurify from "isomorphic-dompurify";

const router = express.Router();

// --- Helper: sanitize HTML on the server side ---
function sanitizeHtml(dirtyHtml) {
  const window = new JSDOM("").window;
  const purify = DOMPurify(window);
  return purify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
      "img", "a", "strong", "em", "br", "ul", "li", "ol",
      "section", "article",
    ],
    ALLOWED_ATTR: ["class", "id", "src", "alt", "href", "style", "data-*"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover"],
  });
}

// --- GET /api/app-bar-themes ---
// Returns all saved themes (for the management list)
router.get("/api/app-bar-themes", async (req, res) => {
  try {
    const themes = await AppBarTheme.find().sort({ updatedAt: -1 });
    res.json(themes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching themes", error: err.message });
  }
});

// --- GET /api/app-bar-themes/active ---
// Returns the currently active theme for the live app.
// Checks: isActive=true AND (no schedule OR now is within schedule).
router.get("/api/app-bar-themes/active", async (req, res) => {
  try {
    const now = new Date();

    // First: look for a scheduled & active theme where "now" is in range
    let activeTheme = await AppBarTheme.findOne({
      isActive: true,
      $or: [
        // No schedule at all
        { "schedule.start": null, "schedule.end": null },
        // Within schedule window
        {
          "schedule.start": { $lte: now },
          "schedule.end": { $gte: now },
        },
        // Only a start date, no end (open-ended)
        {
          "schedule.start": { $lte: now },
          "schedule.end": null,
        },
      ],
    }).sort({ updatedAt: -1 });

    if (!activeTheme) {
      return res.json(null); // No active theme
    }

    res.json(activeTheme);
  } catch (err) {
    res.status(500).json({ message: "Error fetching active theme", error: err.message });
  }
});

// --- GET /api/app-bar-themes/:id ---
// Returns a single theme (to reopen in the editor)
router.get("/api/app-bar-themes/:id", async (req, res) => {
  try {
    const theme = await AppBarTheme.findById(req.params.id);
    if (!theme) return res.status(404).json({ message: "Theme not found" });
    res.json(theme);
  } catch (err) {
    res.status(500).json({ message: "Error fetching theme", error: err.message });
  }
});

// --- POST /api/app-bar-themes ---
// Create a new theme
router.post("/api/app-bar-themes", async (req, res) => {
  try {
    const {
      name, description, tag, gjsData,
      html, css, bgColor, textColor,
      isActive, schedule, createdBy,
    } = req.body;

    const sanitizedHtml = sanitizeHtml(html || "");

    const theme = new AppBarTheme({
      name, description, tag, gjsData,
      html: sanitizedHtml, css,
      bgColor, textColor,
      isActive: isActive || false,
      schedule: schedule || { start: null, end: null },
      createdBy,
      updatedBy: createdBy,
    });

    const saved = await theme.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error creating theme", error: err.message });
  }
});

// --- PUT /api/app-bar-themes/:id ---
// Update an existing theme
router.put("/api/app-bar-themes/:id", async (req, res) => {
  try {
    const {
      name, description, tag, gjsData,
      html, css, bgColor, textColor,
      isActive, schedule, updatedBy,
    } = req.body;

    const sanitizedHtml = sanitizeHtml(html || "");

    const updated = await AppBarTheme.findByIdAndUpdate(
      req.params.id,
      {
        name, description, tag, gjsData,
        html: sanitizedHtml, css,
        bgColor, textColor,
        isActive,
        schedule,
        updatedBy,
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Theme not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error updating theme", error: err.message });
  }
});

// --- PATCH /api/app-bar-themes/:id/toggle ---
// Quick activate/deactivate
router.patch("/api/app-bar-themes/:id/toggle", async (req, res) => {
  try {
    const theme = await AppBarTheme.findById(req.params.id);
    if (!theme) return res.status(404).json({ message: "Theme not found" });
    theme.isActive = !theme.isActive;
    theme.updatedBy = req.body.updatedBy || "system";
    await theme.save();
    res.json(theme);
  } catch (err) {
    res.status(500).json({ message: "Error toggling theme", error: err.message });
  }
});

// --- DELETE /api/app-bar-themes/:id ---
router.delete("/api/app-bar-themes/:id", async (req, res) => {
  try {
    const deleted = await AppBarTheme.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Theme not found" });
    res.json({ message: "Theme deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting theme", error: err.message });
  }
});

export default router;
