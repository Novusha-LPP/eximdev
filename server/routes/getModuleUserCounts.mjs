import express from "express";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.get("/api/get-module-user-counts", async (req, res) => {
  try {
    const counts = await UserModel.aggregate([
      { $unwind: "$modules" }, // Split array into separate documents
      { $group: { _id: "$modules", count: { $sum: 1 } } }, // count occurrences
    ]);

    // Transform to a simpler object { "Module Name": 5, ... }
    const countsMap = {};
    counts.forEach((item) => {
      countsMap[item._id] = item.count;
    });

    res.json(countsMap);
  } catch (error) {
    console.error("Error fetching module counts:", error);
    res.status(500).json({ message: "Error fetching module counts" });
  }
});

export default router;
