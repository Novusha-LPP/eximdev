import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { getBranchMatch } from "../../utils/branchFilter.mjs";

const router = express.Router();

// Route: /api/report/monthly-containers/:year/:month
router.get("/api/report/monthly-containers/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const { custom_house, branchId, category } = req.query;
  const monthInt = parseInt(month);

  // Build branch filter using the shared utility
  const branchMatch = getBranchMatch(branchId, category);

  try {
    // Create base match condition
    const baseMatch = {
      out_of_charge: { $ne: null, $ne: "" },
      importer: { $ne: null, $ne: "" },
      ...branchMatch,
    };

    // Add custom_house filter if provided
    if (custom_house) {
      baseMatch.custom_house = custom_house;
    }

    // Dynamic grouping
    const groupId = custom_house
      ? { importer: "$importer", custom_house: "$custom_house" }
      : { importer: "$importer" };

    const [containerStats, beStats, oocStats] = await Promise.all([
      // CONTAINER AGGREGATION
      JobModel.aggregate([
        { $match: baseMatch },
        {
          $match: {
            $and: [
              { be_filing_type: { $ne: "Ex-Bond" } },
              { type_of_b_e: { $ne: "Ex-Bond" } }
            ]
          }
        },
        {
          $addFields: {
            outOfChargeDate: {
              $convert: {
                input: "$out_of_charge",
                to: "date",
                onError: null,
                onNull: null
              }
            },
          },
        },
        { $match: { outOfChargeDate: { $ne: null } } },
        { $addFields: { outMonth: { $month: "$outOfChargeDate" }, outYear: { $year: "$outOfChargeDate" } } },
        {
          $addFields: {
            startYear: {
              $cond: [
                { $gte: ["$outMonth", 4] },
                "$outYear",
                { $subtract: ["$outYear", 1] }
              ]
            }
          }
        },
        {
          $addFields: {
            fYear: {
              $concat: [
                { $substr: [{ $toString: "$startYear" }, 2, 2] },
                "-",
                { $substr: [{ $toString: { $add: ["$startYear", 1] } }, 2, 2] }
              ]
            }
          }
        },
        { $match: { fYear: year, outMonth: monthInt } },
        {
          $addFields: {
            isAir: { $regexMatch: { input: { $ifNull: ["$mode", ""] }, regex: "air", options: "i" } },
            isLCL: { $regexMatch: { input: { $ifNull: ["$consignment_type", ""] }, regex: "lcl", options: "i" } },
            c20Raw: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$container_nos", []] },
                  as: "c",
                  cond: { $regexMatch: { input: { $ifNull: ["$$c.size", ""] }, regex: "20" } }
                }
              }
            },
            c40Raw: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$container_nos", []] },
                  as: "c",
                  cond: { $regexMatch: { input: { $ifNull: ["$$c.size", ""] }, regex: "40|45" } }
                }
              }
            }
          }
        },
        {
          $addFields: {
            c20: {
              $cond: [
                { $or: ["$isAir", "$isLCL"] },
                0,
                {
                  $cond: [
                    { $and: [{ $eq: ["$c20Raw", 0] }, { $eq: ["$c40Raw", 0] }, { $regexMatch: { input: { $ifNull: ["$no_of_container", ""] }, regex: "20" } }] },
                    {
                      $toInt: {
                        $ifNull: [
                          { $arrayElemAt: [{ $regexFind: { input: { $ifNull: ["$no_of_container", ""] }, regex: "\\b(\\d+)\\s*x\\s*20" } }, 1] },
                          { $toInt: { $ifNull: ["$container_count", 1] } }
                        ]
                      }
                    },
                    "$c20Raw"
                  ]
                }
              ]
            },
            c40: {
              $cond: [
                { $or: ["$isAir", "$isLCL"] },
                0,
                {
                  $cond: [
                    { $and: [{ $eq: ["$c20Raw", 0] }, { $eq: ["$c40Raw", 0] }, { $regexMatch: { input: { $ifNull: ["$no_of_container", ""] }, regex: "40|45" } }] },
                    {
                      $toInt: {
                        $ifNull: [
                          { $arrayElemAt: [{ $regexFind: { input: { $ifNull: ["$no_of_container", ""] }, regex: "\\b(\\d+)\\s*x\\s*40" } }, 1] },
                          { $toInt: { $ifNull: ["$container_count", 1] } }
                        ]
                      }
                    },
                    "$c40Raw"
                  ]
                }
              ]
            },
            lclCount: {
              $cond: [
                { $and: [{ $not: "$isAir" }, "$isLCL"] },
                1,
                0
              ]
            }
          }
        },
        {
          $group: {
            _id: groupId,
            container20Ft: { $sum: "$c20" },
            container40Ft: { $sum: "$c40" },
            lcl20Ft: { $sum: "$lclCount" },
            lcl40Ft: { $sum: 0 },
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
            totalContainers: { $add: ["$container20Ft", "$container40Ft", "$lcl20Ft"] },
            teu: { $add: ["$container20Ft", { $multiply: ["$container40Ft", 2] }, "$lcl20Ft"] }
          },
        },
      ]),

      // BE DATE AGGREGATION
      JobModel.aggregate([
        {
          $match: {
            out_of_charge: { $ne: null, $ne: "" },
            be_date: { $ne: null, $ne: "" },
            importer: { $ne: null, $ne: "" },
            ...branchMatch,
            ...(custom_house ? { custom_house } : {}),
          },
        },
        {
          $addFields: {
            oocDateObj: {
              $convert: {
                input: "$out_of_charge",
                to: "date",
                onError: null,
                onNull: null
              }
            },
            beDateObj: {
              $convert: {
                input: "$be_date",
                to: "date",
                onError: null,
                onNull: null
              }
            },
          },
        },
        { $match: { oocDateObj: { $ne: null }, beDateObj: { $ne: null } } },
        { 
          $addFields: { 
            beMonth: { $month: "$beDateObj" },
            oocMonth: { $month: "$oocDateObj" },
            oocYear: { $year: "$oocDateObj" }
          } 
        },
        {
          $addFields: {
            startYear: {
              $cond: [
                { $gte: ["$oocMonth", 4] },
                "$oocYear",
                { $subtract: ["$oocYear", 1] }
              ]
            }
          }
        },
        {
          $addFields: {
            fYear: {
              $concat: [
                { $substr: [{ $toString: "$startYear" }, 2, 2] },
                "-",
                { $substr: [{ $toString: { $add: ["$startYear", 1] } }, 2, 2] }
              ]
            }
          }
        },
        { $match: { fYear: year, beMonth: monthInt } },
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

      // OUT OF CHARGE COUNT (monthly, importer-wise)
      JobModel.aggregate([
        {
          $match: {
            out_of_charge: { $ne: null, $ne: "" },
            importer: { $ne: null, $ne: "" },
            ...branchMatch,
            ...(custom_house ? { custom_house } : {}),
          },
        },
        {
          $addFields: {
            oocDateObj: {
              $convert: {
                input: "$out_of_charge",
                to: "date",
                onError: null,
                onNull: null
              }
            },
          },
        },
        { $match: { oocDateObj: { $ne: null } } },
        { $addFields: { oocMonth: { $month: "$oocDateObj" }, oocYear: { $year: "$oocDateObj" } } },
        {
          $addFields: {
            startYear: {
              $cond: [
                { $gte: ["$oocMonth", 4] },
                "$oocYear",
                { $subtract: ["$oocYear", 1] }
              ]
            }
          }
        },
        {
          $addFields: {
            fYear: {
              $concat: [
                { $substr: [{ $toString: "$startYear" }, 2, 2] },
                "-",
                { $substr: [{ $toString: { $add: ["$startYear", 1] } }, 2, 2] }
              ]
            }
          }
        },
        { $match: { fYear: year, oocMonth: monthInt } },
        {
          $group: {
            _id: groupId,
            oocCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            importer: "$_id.importer",
            custom_house: custom_house ? "$_id.custom_house" : null,
            oocCount: 1,
          },
        },
      ]),
    ]);

    // MERGE RESULTS BY IMPORTER (+ custom_house if provided)
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
        totalContainers: entry.totalContainers ?? (entry.container20Ft + entry.container40Ft + entry.lcl20Ft),
        teu: entry.teu ?? (entry.container20Ft + (2 * entry.container40Ft) + entry.lcl20Ft),
        beDateCount: 0,
        oocCount: 0,
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
          totalContainers: 0,
          teu: 0,
          beDateCount: entry.beDateCount,
          oocCount: 0,
        };
      }
    }

    for (const entry of oocStats) {
      const key = custom_house
        ? `${entry.importer}|${entry.custom_house || ""}`
        : entry.importer;

      if (merged[key]) {
        merged[key].oocCount = entry.oocCount;
      } else {
        merged[key] = {
          importer: entry.importer,
          ...(custom_house && { custom_house: entry.custom_house || "" }),
          container20Ft: 0,
          container40Ft: 0,
          lcl20Ft: 0,
          lcl40Ft: 0,
          totalContainers: 0,
          teu: 0,
          beDateCount: 0,
          oocCount: entry.oocCount,
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
      details: error.message,
    });
  }
});

export default router;
