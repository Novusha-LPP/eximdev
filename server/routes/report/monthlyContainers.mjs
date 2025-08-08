import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Route: /api/report/monthly-containers/:year/:month
router.get("/api/report/monthly-containers/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const { custom_house } = req.query; // Get custom_house from query parameters
  const monthInt = parseInt(month);

  try {
    // Create base match condition
    const baseMatch = {
      year,
      out_of_charge: { $ne: null, $ne: "" },
      importer: { $ne: null, $ne: "" },
    };
    
    // Add custom_house filter if provided
    if (custom_house) {
      baseMatch.custom_house = custom_house;
    }
    
    const [containerStats, beStats] = await Promise.all([
      // CONTAINER AGGREGATION
      JobModel.aggregate([
        {
          $match: baseMatch,
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
            _id: {
              importer: "$importer",
               custom_house: "$custom_house"
            },

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
            importer: "$_id.importer",
            custom_house: "$_id.custom_house",
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
            ...(custom_house ? { custom_house } : {}), // Add custom_house filter if provided
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
            _id: {
              importer: "$importer",
              custom_house: "$custom_house"
            },
            beDateCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            importer: "$_id.importer",
            custom_house: "$_id.custom_house",
            beDateCount: 1,
          },
        },
      ]),
    ]);

    // MERGE RESULTS BY IMPORTER AND custom_house
    const merged = {};

    for (const entry of containerStats) {
      const key = `${entry.importer}|${entry.custom_house || ""}`;
      merged[key] = {
        importer: entry.importer,
        custom_house: entry.custom_house || "",
        container20Ft: entry.container20Ft,
        container40Ft: entry.container40Ft,
        lcl20Ft: entry.lcl20Ft,
        lcl40Ft: entry.lcl40Ft,
        beDateCount: 0,
      };
    }

    for (const entry of beStats) {
      const key = `${entry.importer}|${entry.custom_house || ""}`;
      if (merged[key]) {
        merged[key].beDateCount = entry.beDateCount;
      } else {
        merged[key] = {
          importer: entry.importer,
          custom_house: entry.custom_house || "",
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
