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

// // Helper function to fetch today's date in "YYYY-MM-DD" format
// const getTodayDate = () => {
//   const today = new Date();
//   const day = String(today.getDate()).padStart(2, "0");
//   const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are zero-based
//   const year = today.getFullYear();
//   return `${year}-${month}-${day}`; // Format: YYYY-MM-DD
// };

// const todayDate = getTodayDate(); // Current date in YYYY-MM-DD

// const todayYearDate = "2024-11-14"; // Current date in YYYY-MM-DD
// Function to fetch job overview data using MongoDB aggregation
const fetchJobOverviewData = async (year) => {

  const today = new Date();
  const todayDate = today.toISOString().split("T")[0]; // Always fresh
  const todayYearDate = new Date().toISOString().split("T")[0]; // Current date in YYYY-MM-DD
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

          todayJobCreateImport: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i", // Case-insensitive match
                      },
                    },
                    {
                      $regexMatch: {
                        input: {
                          $substr: ["$job_date", 0, 10], // Extract the "DD/MM/YYYY" portion from `job_date`
                        },
                        regex: todayDate,
                      },
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          todayJobBeDate: {
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
                      $eq: [
                        {
                          $substr: ["$be_date", 0, 10],
                        },
                        todayYearDate,
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          todayJobOutOfCharge: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i", // Case-insensitive match
                      },
                    },
                    {
                      $eq: ["$out_of_charge", todayYearDate], // Check if out_of_charge matches today's date
                    },
                  ],
                },
                1, // Increment the count if the condition is true
                0, // Otherwise, don't increment
              ],
            },
          },

          todayJobPcvDate: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i", // Case-insensitive match
                      },
                    },
                    {
                      $eq: ["$pcv_date", todayYearDate], // Check if pcv_date matches today's date
                    },
                  ],
                },
                1, // Increment the count if the condition is true
                0, // Otherwise, don't increment
              ],
            },
          },

          todayJobArrivalDate: {
            $sum: {
              $cond: [
                {
                  $and: [
                    // Check if the job has a status of "Pending"
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i", // Case-insensitive match
                      },
                    },
                    // Check if at least one container has a valid arrival_date and matches today's date
                    {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: "$container_nos",
                              as: "container",
                              cond: {
                                $and: [
                                  { $ne: ["$$container.arrival_date", null] }, // Ensure arrival_date is not null
                                  { $ne: ["$$container.arrival_date", ""] }, // Ensure arrival_date is not an empty string
                                  {
                                    $eq: [
                                      "$$container.arrival_date",
                                      new Date().toISOString().split("T")[0],
                                    ],
                                  }, // Match today's date
                                ],
                              },
                            },
                          },
                        },
                        0,
                      ], // Check if filtered array has at least one element
                    },
                  ],
                },
                1, // Increment the count if the condition is true
                0, // Otherwise, don't increment
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
                    }, // Check if status is 'pending'
                    {
                      $not: {
                        $regexMatch: {
                          input: "$be_no",
                          regex: "^cancelled$",
                          options: "i",
                        },
                      },
                    }, // Exclude cancelled jobs
                    { $ne: ["$job_no", null] }, // Ensure job_no is not null
                    { $eq: ["$out_of_charge", ""] }, // out_of_charge must be empty string
                    {
                      $or: [
                        {
                          $eq: [
                            { $ifNull: ["$esanchit_completed_date_time", ""] },
                            "",
                          ],
                        }, // esanchit_completed_date_time is null or empty
                        { $eq: ["$esanchit_completed_date_time", null] }, // esanchit_completed_date_time is null
                        { $eq: ["$cth_documents.document_check_date", ""] }, // document_check_date is empty
                      ],
                    },
                  ],
                },
                1, // Add 1 if all conditions are true
                0, // Otherwise, add 0
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
                            {
                              $ifNull: [
                                "$documentation_completed_date_time",
                                "",
                              ],
                            },
                            "",
                          ],
                        }, // Field does not exist or is empty
                        { $eq: ["$documentation_completed_date_time", ""] }, // Field is explicitly empty string
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
                    // Check if status matches 'pending' (case-insensitive)
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },

                    // Check if job_no is not null
                    { $ne: ["$job_no", null] },

                    // Check if be_no does not exist or is empty
                    {
                      $or: [
                        { $eq: [{ $ifNull: ["$be_no", ""] }, ""] }, // be_no does not exist or is empty
                      ],
                    },

                    // Check if esanchit_completed_date_time exists and is not empty
                    {
                      $ne: [
                        { $ifNull: ["$esanchit_completed_date_time", ""] },
                        "",
                      ],
                    },

                    // Check if documentation_completed_date_time exists and is not empty
                    {
                      $ne: [
                        { $ifNull: ["$documentation_completed_date_time", ""] },
                        "",
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
                    {
                      $regexMatch: {
                        input: "$status",
                        regex: "^pending$",
                        options: "i",
                      },
                    },
                    {
                      $or: [
                        {
                          $and: [
                            {
                              $or: [
                                { $eq: ["$do_completed", true] },
                                { $eq: ["$do_completed", "Yes"] },
                                {
                                  $ne: [
                                    {
                                      $ifNull: ["$do_completed", null],
                                    },
                                    null,
                                  ],
                                },
                              ],
                            },
                            {
                              $gt: [
                                {
                                  $size: {
                                    $filter: {
                                      input: "$container_nos.do_revalidation",
                                      as: "revalidation",
                                      cond: {
                                        $and: [
                                          {
                                            $ne: [
                                              "$$revalidation.do_revalidation_upto",
                                              "",
                                            ],
                                          },
                                          {
                                            $eq: [
                                              "$$revalidation.do_Revalidation_Completed",
                                              false,
                                            ],
                                          },
                                        ],
                                      },
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          ],
                        },
                        {
                          $and: [
                            {
                              $or: [
                                { $eq: ["$doPlanning", true] },
                                { $eq: ["$doPlanning", "true"] },
                              ],
                            },
                            {
                              $or: [
                                { $eq: ["$do_completed", false] },
                                { $eq: ["$do_completed", "No"] },
                                {
                                  $eq: [
                                    {
                                      $ifNull: ["$do_completed", ""],
                                    },
                                    "",
                                  ],
                                },
                              ],
                            },
                          ],
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

          operationsPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    // Status is "Pending"
                    { $eq: ["$status", "Pending"] },

                    // `be_no` checks
                    {
                      $and: [
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
                      ],
                    },

                    // `container_nos.arrival_date` checks
                    {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: "$container_nos",
                              as: "container",
                              cond: {
                                $and: [
                                  { $ne: ["$$container.arrival_date", null] },
                                  { $ne: ["$$container.arrival_date", ""] },
                                ],
                              },
                            },
                          },
                        },
                        0,
                      ],
                    },

                    // `completed_operation_date` checks
                    {
                      $or: [
                        { $eq: ["$completed_operation_date", null] },
                        { $eq: ["$completed_operation_date", ""] },
                      ],
                    },
                  ],
                },
                1, // Add 1 if all conditions are met
                0, // Otherwise, add 0
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
          todayJobCreateImport: 1,
          todayJobBeDate: 1,
          todayJobOutOfCharge: 1,
          todayJobPcvDate: 1,
          todayJobArrivalDate: 1,
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
        todayJobCreateImport: 0,
        todayJobBeDate: 0,
        todayJobOutOfCharge: 0,
        todayJobPcvDate: 0,
        todayJobArrivalDate: 0,
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
export default fetchJobOverviewData;

