import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Route: /api/report/monthly-containers/:year/:month
router.get("/api/report/monthly-containers/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const { custom_house } = req.query;
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

    // Create dynamic grouping based on whether custom_house is provided
    const groupId = custom_house 
      ? { importer: "$importer", custom_house: "$custom_house" }
      : { importer: "$importer" };

    const [containerStats, beStats] = await Promise.all([
      // CONTAINER AGGREGATION - FIXED VERSION
      JobModel.aggregate([
        {
          $match: baseMatch,
        },
        {
          $addFields: {
            // Safe date conversion with error handling
            outOfChargeDate: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$out_of_charge", null] },
                    { $ne: ["$out_of_charge", ""] },
                    { $regexMatch: { input: "$out_of_charge", regex: /^\d{4}-\d{2}-\d{2}/ } } // Basic ISO date format check
                  ]
                },
                then: { $toDate: "$out_of_charge" },
                else: null
              }
            }
          }
        },
        {
          $match: {
            outOfChargeDate: { $ne: null } // Filter out documents with invalid dates
          }
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
            _id: groupId,
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
            custom_house: custom_house ? "$_id.custom_house" : null,
            container20Ft: 1,
            container40Ft: 1,
            lcl20Ft: 1,
            lcl40Ft: 1,
          },
        },
      ]),

      // BE DATE AGGREGATION - FIXED VERSION
      JobModel.aggregate([
        {
          $match: {
            year,
            be_date: { $ne: null, $ne: "" },
            importer: { $ne: null, $ne: "" },
            ...(custom_house ? { custom_house } : {}),
          },
        },
        {
          $addFields: {
            // Safe date conversion with error handling
            beDateObj: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$be_date", null] },
                    { $ne: ["$be_date", ""] },
                    { $regexMatch: { input: "$be_date", regex: /^\d{4}-\d{2}-\d{2}/ } } // Basic ISO date format check
                  ]
                },
                then: { $toDate: "$be_date" },
                else: null
              }
            }
          }
        },
        {
          $match: {
            beDateObj: { $ne: null } // Filter out documents with invalid dates
          }
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
            _id: groupId,
            beDateCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            importer: "$_id.importer",
            custom_house: custom_house ? "$_id.custom_house" : null,
            beDateCount: 1,
          },
        },
      ]),
    ]);

    // MERGE RESULTS BY IMPORTER (and custom_house if provided)
    const merged = {};

    for (const entry of containerStats) {
      const key = custom_house 
        ? `${entry.importer}|${entry.custom_house || ""}`
        : entry.importer;
        
      merged[key] = {
        importer: entry.importer,
        ...(custom_house && { custom_house: entry.custom_house || "" }),
        container20Ft: entry.container20Ft,
        container40Ft: entry.container40Ft,
        lcl20Ft: entry.lcl20Ft,
        lcl40Ft: entry.lcl40Ft,
        beDateCount: 0,
      };
    }

    for (const entry of beStats) {
      const key = custom_house 
        ? `${entry.importer}|${entry.custom_house || ""}`
        : entry.importer;
        
      if (merged[key]) {
        merged[key].beDateCount = entry.beDateCount;
      } else {
        merged[key] = {
          importer: entry.importer,
          ...(custom_house && { custom_house: entry.custom_house || "" }),
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
    res.status(500).json({ 
      message: "Server Error while aggregating data.",
      details: error.message 
    });
  }
});

export default router;