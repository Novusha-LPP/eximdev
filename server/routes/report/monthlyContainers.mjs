import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Route: /api/report/monthly-containers/:year/:month
router.get("/api/report/monthly-containers/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const monthInt = parseInt(month);

  try {
    const [containerStats, beStats] = await Promise.all([
      // CONTAINER LOGIC (based on out_of_charge)
      JobModel.aggregate([
        {
          $match: {
            year,
            out_of_charge: { $ne: null, $ne: "" },
            importer: { $ne: null, $ne: "" },
          },
        },
        {
          $addFields: {
            outOfChargeDate: { $toDate: "$out_of_charge" },
          },
        },
        {
          $addFields: {
            outMonth: { $month: "$outOfChargeDate" },
          },
        },
        {
          $match: {
            outMonth: monthInt,
          },
        },
        {
          $group: {
            _id: "$importer",
            container20Ft: {
              $sum: {
                $size: {
                  $filter: {
                    input: "$container_nos",
                    as: "container",
                    cond: { $eq: ["$$container.size", "20"] },
                  },
                },
              },
            },
            container40Ft: {
              $sum: {
                $size: {
                  $filter: {
                    input: "$container_nos",
                    as: "container",
                    cond: { $eq: ["$$container.size", "40"] },
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            importer: "$_id",
            container20Ft: 1,
            container40Ft: 1,
          },
        },
      ]),

      // BE DATE LOGIC (based on be_date month, regardless of out_of_charge)
      JobModel.aggregate([
        {
          $match: {
            year,
            be_date: { $ne: null, $ne: "" },
            importer: { $ne: null, $ne: "" },
          },
        },
        {
          $addFields: {
            beDateObj: { $toDate: "$be_date" },
          },
        },
        {
          $addFields: {
            beMonth: { $month: "$beDateObj" },
          },
        },
        {
          $match: {
            beMonth: monthInt,
          },
        },
        {
          $group: {
            _id: "$importer",
            beDateCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            importer: "$_id",
            beDateCount: 1,
          },
        },
      ]),
    ]);

    // Merge both results by importer
    const merged = {};

    // Merge container stats first
    for (const entry of containerStats) {
      merged[entry.importer] = {
        importer: entry.importer,
        container20Ft: entry.container20Ft,
        container40Ft: entry.container40Ft,
        beDateCount: 0, // default if no beDate
      };
    }

    // Merge be stats
    for (const entry of beStats) {
      if (merged[entry.importer]) {
        merged[entry.importer].beDateCount = entry.beDateCount;
      } else {
        merged[entry.importer] = {
          importer: entry.importer,
          container20Ft: 0,
          container40Ft: 0,
          beDateCount: entry.beDateCount,
        };
      }
    }

    // Convert object back to array
    const result = Object.values(merged).sort((a, b) =>
      a.importer.localeCompare(b.importer)
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Aggregation error:", error);
    res.status(500).json({ message: "Server Error while aggregating data." });
  }
});

export default router;
