import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// GET /api/users/:userId/assets?module=ModuleName
router.get("/api/users/:userId/assets", async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.userId).select("userAssets");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    let assets = user.userAssets || [];
    if (req.query.module) {
      assets = assets.filter(a => a.module === req.query.module);
    }
    res.json({ success: true, data: assets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/:userId/assets
router.post("/api/users/:userId/assets", async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { module, assets } = req.body;
    
    if (!module) {
      return res.status(400).json({ success: false, message: "Module is required" });
    }

    user.userAssets = user.userAssets || [];
    
    // Support single asset or array of assets
    const newAssets = Array.isArray(assets) ? assets : [assets];
    
    for (const asset of newAssets) {
      user.userAssets.push({
        module: module,
        type: asset.type,
        serialNumber: asset.serialNumber || "",
        assignedDate: asset.assignedDate ? new Date(asset.assignedDate) : new Date(),
        status: asset.status || "Assigned",
        remarks: asset.remarks || "",
      });
    }

    await user.save();
    res.status(201).json({ success: true, data: newAssets.length > 1 ? newAssets : newAssets[0] });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:userId/assets/:assetId
router.put("/api/users/:userId/assets/:assetId", async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const assetIndex = (user.userAssets || []).findIndex(
      (a) => a._id && a._id.toString() === req.params.assetId
    );

    if (assetIndex === -1) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    const updates = req.body;
    user.userAssets[assetIndex] = {
      ...user.userAssets[assetIndex].toObject(),
      ...updates,
    };

    await user.save();
    res.json({ success: true, data: user.userAssets[assetIndex] });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/:userId/assets/:assetId
router.delete("/api/users/:userId/assets/:assetId", async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.userAssets = (user.userAssets || []).filter(
      (a) => !a._id || a._id.toString() !== req.params.assetId
    );

    await user.save();
    res.json({ success: true, message: "Asset deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/:userId/assets-by-module
router.get("/api/users/:userId/assets-by-module", async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.userId).select("userAssets");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const assets = user.userAssets || [];
    const grouped = {};
    
    assets.forEach(asset => {
      if (!grouped[asset.module]) {
        grouped[asset.module] = [];
      }
      grouped[asset.module].push(asset);
    });

    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
