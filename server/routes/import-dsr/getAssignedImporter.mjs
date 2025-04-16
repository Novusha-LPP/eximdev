import express from "express";
import User from "../../model/userModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-assigned-importer/:user",authenticateJWT, async (req, res) => {
  const { user } = req.params;
  try {
    const result = await User.aggregate([
      { $match: { username: user } },
      { $project: { importers: 1, _id: 0 } },
    ]);

    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    } else {
      const importers = result[0].importers;
      return res.status(200).json(importers);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch importers" });
  }
});

export default router;
