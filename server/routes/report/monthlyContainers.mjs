import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Route: /api/report/monthly-containers/:year/:month
router.get("/api/report/monthly-containers/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const monthInt = parseInt(month);

  try {
    const [containerStats, beStats] = await Promise.all([
      // CONTAINER AGGREGATION
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

            // Total 20ft containers
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

            // Total 40ft containers
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

            // LCL 20ft containers
            lcl20Ft: {
              $sum: {
                $cond: [
                  { $eq: ["$consignment_type", "LCL"] },
                  {
                    $size: {
                      $filter: {
                        input: "$container_nos",
                        as: "container",
                        cond: { $eq: ["$$container.size", "20"] },
                      },
                    },
                  },
                  0,
                ],
              },
            },

            // LCL 40ft containers
            lcl40Ft: {
              $sum: {
                $cond: [
                  { $eq: ["$consignment_type", "LCL"] },
                  {
                    $size: {
                      $filter: {
                        input: "$container_nos",
                        as: "container",
                        cond: { $eq: ["$$container.size", "40"] },
                      },
                    },
                  },
                  0,
                ],
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
            lcl20Ft: 1,
            lcl40Ft: 1,
          },
        },
      ]),

      // BE DATE AGGREGATION
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

    // MERGE RESULTS BY IMPORTER
    const merged = {};

    for (const entry of containerStats) {
      merged[entry.importer] = {
        importer: entry.importer,
        container20Ft: entry.container20Ft,
        container40Ft: entry.container40Ft,
        lcl20Ft: entry.lcl20Ft,
        lcl40Ft: entry.lcl40Ft,
        beDateCount: 0,
      };
    }

    for (const entry of beStats) {
      if (merged[entry.importer]) {
        merged[entry.importer].beDateCount = entry.beDateCount;
      } else {
        merged[entry.importer] = {
          importer: entry.importer,
          container20Ft: 0,
          container40Ft: 0,
          lcl20Ft: 0,
          lcl40Ft: 0,
          beDateCount: entry.beDateCount,
        };
      }
    }

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
