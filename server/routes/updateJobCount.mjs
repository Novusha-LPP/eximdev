import express from "express";
import JobModel from "../model/jobModel.mjs";

const router = express.Router();
// Define the custom order for grouping
const statusOrder = [
  "Discharged",
  "Gateway IGM Filed",
  "Estimated Time of Arrival",
  "ETA Date Pending",
];
// Function to fetch job overview data using MongoDB aggregation
const fetchJobOverviewData = async (year) => {
  // console.log("Year Parameter:", year);
  try {
    const pipeline = [
      { $match: { year: year.toString() } }, // Filter for the provided year
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          pendingJobs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },
                    {
                      $not: {
                        $regexMatch: {
                          input: "$be_no",
                          regex: "^cancelled$",
                          options: "i",
                        },
                      },
                    },
                    {
                      $or: [
                        { $in: ["$bill_date", [null, ""]] },
                        {
                          $regexMatch: {
                            input: "$status",
                            regex: "^pending$",
                            options: "i",
                          },
                        },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },

          completedJobs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^completed$",
                        options: "i",
                      },
                    }, // Status matches 'completed'
                    {
                      $not: {
                        $regexMatch: {
                          input: "$be_no",
                          regex: "^cancelled$",
                          options: "i",
                        },
                      },
                    }, // BE Number does not match 'cancelled'
                    {
                      $or: [
                        { $not: { $in: ["$bill_date", [null, ""]] } }, // bill_date is not null or empty
                        {
                          $regexMatch: {
                            input: "$status",
                            regex: "^completed$",
                            options: "i",
                          },
                        }, // Status matches 'completed'
                      ],
                    },
                  ],
                },
                1, // Value to sum if condition is true
                0, // Value to sum if condition is false
              ],
            },
          },

          cancelledJobs: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^cancelled$",
                        options: "i",
                      },
                    },
                    {
                      $regexMatch: {
                        input: "$be_no",
                        regex: "^cancelled$",
                        options: "i",
                      },
                    },
                  ],
                },
                1, // Value to sum if condition is true
                0, // Value to sum if condition is false
              ],
            },
          },

          billingPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    }, // Check if status matches 'pending'
                    { $eq: ["$detailed_status", "Billing Pending"] }, // Check if detailed_status is 'Billing Pending'
                  ],
                },
                1, // Add 1 if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          customClearanceCompleted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    }, // Check if status matches 'pending'
                    { $eq: ["$detailed_status", "Custom Clearance Completed"] }, // Check if detailed_status is 'Custom Clearance Completed'
                  ],
                },
                1, // Add 1 if both conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          pcvDoneDutyPaymentPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    }, // Check if status is 'pending'
                    {
                      $eq: [
                        "$detailed_status",
                        "PCV Done, Duty Payment Pending",
                      ],
                    }, // Check detailed_status
                  ],
                },
                1,
                0,
              ],
            },
          },
          beNotedClearancePending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },
                    {
                      $eq: ["$detailed_status", "BE Noted, Clearance Pending"],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          beNotedArrivalPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },
                    { $eq: ["$detailed_status", "BE Noted, Arrival Pending"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          discharged: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },
                    { $eq: ["$detailed_status", "Discharged"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          gatewayIGMFiled: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },
                    { $eq: ["$detailed_status", "Gateway IGM Filed"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          estimatedTimeOfArrival: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },
                    { $eq: ["$detailed_status", "Estimated Time of Arrival"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          etaDatePending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },
                    { $eq: ["$detailed_status", "ETA Date Pending"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          esanchitPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },
                    {
                      $not: {
                        $regexMatch: {
                          input: "$be_no",
                          regex: "^cancelled$",
                          options: "i",
                        },
                      },
                    },
                    { $ne: ["$job_no", null] },
                    { $eq: ["$out_of_charge", ""] },
                    {
                      $or: [
                        {
                          $eq: [
                            { $type: "$esanchit_completed_date_time" },
                            "missing",
                          ],
                        }, // Field is missing
                        { $eq: ["$esanchit_completed_date_time", null] }, // Field is null
                        { $eq: ["$esanchit_completed_date_time", ""] }, // Field is an empty string
                        { $eq: ["$cth_documents.document_check_date", ""] }, // Field is an empty string
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          documentationPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    }, // Check if status is 'pending'
                    { $in: ["$detailed_status", statusOrder] }, // detailed_status is in statusOrder array
                    {
                      $or: [
                        {
                          $eq: [
                            { $type: "$documentation_completed_date_time" },
                            "missing",
                          ],
                        }, // Field is missing
                        { $eq: ["$documentation_completed_date_time", ""] }, // Field is an empty string
                      ],
                    },
                  ],
                },
                1, // Add 1 if all conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          submissionPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    // Status is "Pending" (case-insensitive)
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },

                    // job_no is not null
                    { $ne: ["$job_no", null] },

                    // be_no does not exist or is an empty string
                    {
                      $or: [
                        { $eq: [{ $type: "$be_no" }, "missing"] }, // be_no does not exist
                        { $eq: ["$be_no", ""] }, // be_no is an empty string
                      ],
                    },

                    // esanchit_completed_date_time exists and is not empty
                    {
                      $and: [
                        {
                          $ne: [
                            { $type: "$esanchit_completed_date_time" },
                            "missing",
                          ],
                        }, // esanchit_completed_date_time exists
                        { $ne: ["$esanchit_completed_date_time", ""] }, // esanchit_completed_date_time is not empty
                      ],
                    },

                    // documentation_completed_date_time exists and is not empty
                    {
                      $and: [
                        {
                          $ne: [
                            { $type: "$documentation_completed_date_time" },
                            "missing",
                          ],
                        }, // documentation_completed_date_time exists
                        { $ne: ["$documentation_completed_date_time", ""] }, // documentation_completed_date_time is not empty
                      ],
                    },
                  ],
                },
                1, // Add 1 if all conditions are true
                0, // Otherwise, add 0
              ],
            },
          },
          doPlanningPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    // Status is 'Pending' (case-insensitive)
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },

                    // be_no exists and is not null, empty, or 'cancelled' (case-insensitive)
                    {
                      $and: [
                        { $ne: ["$be_no", null] }, // Field is not null
                        { $ne: ["$be_no", ""] }, // Field is not empty
                        {
                          $not: {
                            $regexMatch: {
                              input: "$be_no",
                              regex: "cancelled",
                              options: "i",
                            },
                          },
                        }, // Field is not 'cancelled'
                      ],
                    },

                    // "container_nos.arrival_date" exists and is not null or empty
                    {
                      $and: [
                        { $ne: ["$container_nos.arrival_date", null] }, // Field is not null
                        { $ne: ["$container_nos.arrival_date", ""] }, // Field is not empty
                      ],
                    },

                    // "completed_operation_date" does not exist or is empty
                    {
                      $or: [
                        {
                          $eq: [
                            { $type: "$completed_operation_date" },
                            "missing",
                          ],
                        }, // Field does not exist
                        { $eq: ["$completed_operation_date", ""] }, // Field is empty
                      ],
                    },
                  ],
                },
                1, // Add 1 if conditions are met
                0, // Otherwise, add 0
              ],
            },
          },
          operationsPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    // Exact status match (case-insensitive)
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },

                    // be_no conditions
                    { $ne: ["$be_no", null] },
                    { $ne: ["$be_no", ""] },
                    {
                      $not: {
                        $regexMatch: {
                          input: "$be_no",
                          regex: "cancelled",
                          options: "i",
                        },
                      },
                    },

                    // container_nos.arrival_date conditions
                    { $ne: ["$container_nos.arrival_date", null] },
                    { $ne: ["$container_nos.arrival_date", ""] },

                    // completed_operation_date conditions
                    {
                      $or: [
                        { $eq: ["$completed_operation_date", null] },
                        { $eq: ["$completed_operation_date", ""] },
                      ],
                    },
                  ],
                },
                1, // If all conditions are true, count this document
                0, // Otherwise, don't count
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalJobs: 1,
          pendingJobs: 1,
          completedJobs: 1,
          cancelledJobs: 1,
          billingPending: 1,
          customClearanceCompleted: 1,
          pcvDoneDutyPaymentPending: 1,
          beNotedClearancePending: 1,
          beNotedArrivalPending: 1,
          discharged: 1,
          gatewayIGMFiled: 1,
          estimatedTimeOfArrival: 1,
          etaDatePending: 1,
          esanchitPending: 1,
          documentationPending: 1,
          submissionPending: 1,
          doPlanningPending: 1,
          operationsPending: 1,
        },
      },
    ];

    // console.log("MongoDB Pipeline:", JSON.stringify(pipeline));

    const result = await JobModel.aggregate(pipeline);

    return (
      result[0] || {
        totalJobs: 0,
        pendingJobs: 0,
        completedJobs: 0,
        cancelledJobs: 0,
        billingPending: 0,
        customClearanceCompleted: 0,
        pcvDoneDutyPaymentPending: 0,
        beNotedClearancePending: 0,
        beNotedArrivalPending: 0,
        discharged: 0,
        gatewayIGMFiled: 0,
        estimatedTimeOfArrival: 0,
        etaDatePending: 0,
        esanchitPending: 0,
        documentationPending: 0,
        submissionPending: 0,
        doPlanningPending: 0,
        operationsPending: 0,
      }
    );
  } catch (err) {
    console.error("Error in fetchJobOverviewData:", err);
    return null;
  }
};

// SSE Implementation with improved error handling and CORS
router.get("/api/sse/job-overview/:year", async (req, res) => {
  const { year } = req.params;

  // Enable CORS for SSE
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // res.flushHeaders();

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders(); // Force headers to be sent

  try {
    // Function to send data
    const sendJobCounts = async () => {
      try {
        const data = await fetchJobOverviewData(year);
        if (data) {
          // Ensure proper SSE formatting
          res.write(`event: message\n`);
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          res.flush(); // Force flush
          console.log("SSE Data Sent:", JSON.stringify(data));
        } else {
          res.write(`event: message\n`);
          res.write(`data: ${JSON.stringify({ totalJobs: 0 })}\n\n`);
        }
      } catch (err) {
        console.error("Error sending SSE:", err);
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: "Server error" })}\n\n`);
      }
    };

    // Send initial data immediately
    await sendJobCounts();

    // Set up interval to send periodic updates
    const intervalId = setInterval(sendJobCounts, 10000);

    // Heartbeat to keep connection alive
    const heartbeatId = setInterval(() => {
      res.write(`event: heartbeat\n`);
      res.write(`data: {}\n\n`);
    }, 30000);

    // Clean up on client disconnect
    req.on("close", () => {
      // console.log("SSE client disconnected");
      clearInterval(intervalId);
      clearInterval(heartbeatId);
      res.end();
    });
  } catch (error) {
    console.error("SSE Setup Error:", error);
    res.status(500).end();
  }
});
// Handle CORS Preflight Requests
router.options("/api/sse/job-overview/:year", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

export default router;
