import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

const SCRAP_HS_CODES = [
  "26203090", "26204010", "72041000", "72042110", "72042190",
  "72042910", "72042990", "72044900", "72045000", "74040011",
  "74040012", "74040022", "75030010", "76020010", "76020090",
  "79020010", "81042010", "81083000", "83100010"
];

router.get("/api/report/import-clearance/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const monthInt = parseInt(month);

  try {
    const result = await JobModel.aggregate([
      {
        $match: {
          year,
          out_of_charge: { $type: "string", $ne: "" },
          be_date: { $type: "string", $ne: "" },
          importer: { $ne: null, $ne: "" }
        }
      },
      {
        $addFields: {
          oocDateObj: { $toDate: "$out_of_charge" },
          beDateObj: { $toDate: "$be_date" }
        }
      },
      {
        $addFields: {
          oocMonth: { $month: "$oocDateObj" }
        }
      },
      {
        $match: {
          oocMonth: monthInt
        }
      },
      {
        $addFields: {
          containerNumbers: {
            $map: {
              input: "$container_nos",
              as: "c",
              in: "$$c.container_number"
            }
          },
          sizeCounts: {
            $reduce: {
              input: "$container_nos",
              initialValue: { ft20: 0, ft40: 0 },
              in: {
                ft20: {
                  $add: [
                    "$$value.ft20",
                    { $cond: [{ $eq: ["$$this.size", "20"] }, 1, 0] }
                  ]
                },
                ft40: {
                  $add: [
                    "$$value.ft40",
                    { $cond: [{ $eq: ["$$this.size", "40"] }, 1, 0] }
                  ]
                }
              }
            }
          },
          teus: {
            $sum: {
              $map: {
                input: "$container_nos",
                as: "c",
                in: {
                  $cond: [
                    { $eq: ["$$c.size", "20"] }, 1,
                    { $cond: [{ $eq: ["$$c.size", "40"] }, 2, 0] }
                  ]
                }
              }
            }
          },
          remarks: {
            $cond: [
              { $in: ["$cth_no", SCRAP_HS_CODES] },
              "SCRAP",
              "OTHERS"
            ]
          }
        }
      },
      {
        $addFields: {
          noOfContrSize: {
            $trim: {
              input: {
                $concat: [
                  {
                    $cond: [
                      { $gt: ["$sizeCounts.ft20", 0] },
                      { $concat: [{ $toString: "$sizeCounts.ft20" }, "x20"] },
                      ""
                    ]
                  },
                  {
                    $cond: [
                      {
                        $and: [
                          { $gt: ["$sizeCounts.ft20", 0] },
                          { $gt: ["$sizeCounts.ft40", 0] }
                        ]
                      },
                      " + ",
                      ""
                    ]
                  },
                  {
                    $cond: [
                      { $gt: ["$sizeCounts.ft40", 0] },
                      { $concat: [{ $toString: "$sizeCounts.ft40" }, "x40"] },
                      ""
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          job_no: 1,
          location: "$custom_house",
          importer: 1,
          commodity: "$description",
          be_no: 1,
          be_date: 1,
          containerNumbers: 1,
          totalContainers: { $size: "$container_nos" },
          noOfContrSize: 1,
          teus: 1,
          out_of_charge: 1,
          remarks: 1
        }
      }
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Error in import clearance route:", error);
    res.status(500).json({ message: "Failed to generate import clearance report." });
  }
});

export default router;
