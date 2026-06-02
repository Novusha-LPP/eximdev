import express from "express";
import UILayoutConfigModel from "../../model/UILayoutConfig.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "Admin") {
    next();
  } else {
    res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }
};

// GET active layout config (public)
router.get("/layout-config/active", async (req, res) => {
  try {
    let config = await UILayoutConfigModel.findOne({ isActive: true }).lean();
    if (!config) {
      // Return default config if none is active
      config = {
        _id: "default",
        name: "Default",
        isActive: true,
        appbar: {
          enabled: true,
          backgroundColor: "rgba(249, 250, 251, 0.3)",
          backgroundOpacity: 0.3,
          blurIntensity: 6,
          textColor: "#000000",
          shadow: "none",
          height: 64,
          borderBottom: "none",
          extraContent: [],
        },
        sidebar: {
          enabled: true,
          backgroundColor: "#111b21",
          iconColor: "#ffffff9f",
          activeItemColor: "#ffffff",
          hoverColor: "#ffffff",
          hoverBgColor: "rgba(255,255,255,0.08)",
          width: 60,
          mode: "icon-only",
          backgroundImage: "sidebar-bg.webp",
          glassEffect: false,
          borderRight: "none",
          itemSpacing: 0,
        },
        banner: {
          enabled: false,
          text: "",
          link: "",
          textColor: "#ffffff",
          backgroundColor: "linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)",
          height: 36,
          animationType: "none",
          displayMode: "top-bar",
          opacity: 1.0,
          closable: true,
          customCss: "",
          startDate: null,
          endDate: null,
        },
      };
    }
    res.json(config);
  } catch (err) {
    console.error("Error fetching active layout config:", err);
    res.status(500).json({ error: "Failed to fetch active layout config" });
  }
});

// GET all configs (admin)
router.get("/layout-config", authMiddleware, isAdmin, async (req, res) => {
  try {
    const configs = await UILayoutConfigModel.find().sort({ updatedAt: -1 }).lean();
    res.json(configs);
  } catch (err) {
    console.error("Error fetching layout configs:", err);
    res.status(500).json({ error: "Failed to fetch layout configs" });
  }
});

// POST create new config (admin)
router.post("/layout-config", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { name, appbar, sidebar, banner, customCss } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "Config name is required" });
    }

    const config = new UILayoutConfigModel({
      name: name.trim(),
      updatedBy: req.user?._id || null,
      appbar,
      sidebar,
      banner,
      customCss: customCss || "",
    });

    await config.save();
    res.status(201).json(config);
  } catch (err) {
    console.error("Error creating layout config:", err);
    res.status(500).json({ error: "Failed to create layout config" });
  }
});

// PUT update config (admin)
router.put("/layout-config/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { name, appbar, sidebar, banner, customCss, isActive } = req.body;
    const update = {};

    if (name !== undefined) update.name = name.trim();
    if (appbar !== undefined) update.appbar = appbar;
    if (sidebar !== undefined) update.sidebar = sidebar;
    if (banner !== undefined) update.banner = banner;
    if (customCss !== undefined) update.customCss = customCss;
    if (isActive !== undefined) update.isActive = isActive;
    update.updatedBy = req.user?._id || null;

    const config = await UILayoutConfigModel.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({ error: "Layout config not found" });
    }

    res.json(config);
  } catch (err) {
    console.error("Error updating layout config:", err);
    res.status(500).json({ error: "Failed to update layout config" });
  }
});

// DELETE config (admin)
router.delete("/layout-config/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const config = await UILayoutConfigModel.findByIdAndDelete(req.params.id);
    if (!config) {
      return res.status(404).json({ error: "Layout config not found" });
    }
    res.json({ message: "Layout config deleted successfully" });
  } catch (err) {
    console.error("Error deleting layout config:", err);
    res.status(500).json({ error: "Failed to delete layout config" });
  }
});

// PUT activate a config (admin)
router.put("/layout-config/:id/activate", authMiddleware, isAdmin, async (req, res) => {
  try {
    const config = await UILayoutConfigModel.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: true, updatedBy: req.user?._id || null } },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({ error: "Layout config not found" });
    }

    res.json(config);
  } catch (err) {
    console.error("Error activating layout config:", err);
    res.status(500).json({ error: "Failed to activate layout config" });
  }
});

export default router;
