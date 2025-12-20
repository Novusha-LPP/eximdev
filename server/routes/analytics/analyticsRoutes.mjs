import express from "express";
import JobModel from "../../model/jobModel.mjs";
import mongoose from "mongoose";

const router = express.Router();

// Helper to parse dates
const parseDate = (d) => new Date(d);

router.get("/api/analytics/:module", async (req, res) => {
    try {
        const { module } = req.params;
        let { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            // Default to today if not provided
            const today = new Date();
            startDate = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            endDate = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Ensure end date covers the full day
        end.setHours(23, 59, 59, 999);

        let pipeline = [];

        switch (module) {
            case "overview":
                pipeline = getOverviewPipeline(start, end);
                break;
            case "movement":
                pipeline = getMovementPipeline(start, end);
                break;
            case "customs":
                pipeline = getCustomsPipeline(start, end);
                break;
            case "documentation":
                pipeline = getDocumentationPipeline(start, end);
                break;
            case "do-management":
                pipeline = getDoManagementPipeline(start, end);
                break;
            case "billing":
                pipeline = getBillingPipeline(start, end);
                break;
            case "exceptions":
                pipeline = getExceptionsPipeline(start, end);
                break;
            default:
                return res.status(400).json({ error: "Invalid module" });
        }

        const result = await JobModel.aggregate(pipeline);
        res.json(result[0] || {});
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Overview Pipeline
const getOverviewPipeline = (start, end) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    return [
        {
            $facet: {
                jobs_created_today: [
                    {
                        $match: {
                            job_date: { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: {
                            job_no: 1, importer: 1, shipping_line_airline: 1,
                            relevant_date: "$job_date"
                        }
                    }
                ],
                operations_completed: [
                    {
                        $match: {
                            completed_operation_date: { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$completed_operation_date" }
                    }
                ],
                examination_planning: [
                    { $match: { examination_planning_date: { $gte: toYMD(start), $lte: end.toISOString() } } },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$examination_planning_date" } }
                ],
                jobs_trend: [
                    {
                        $match: {
                            job_date: { $gte: sevenDaysAgoStr, $lte: todayStr }
                        }
                    },
                    {
                        $group: {
                            _id: "$job_date",
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                ops_trend: [
                    { $match: { completed_operation_date: { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: { $substr: ["$completed_operation_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                arrivals_today: [
                    { $unwind: "$container_nos" },
                    {
                        $match: {
                            "container_nos.arrival_date": { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: {
                            job_no: 1, importer: 1, shipping_line_airline: 1,
                            relevant_date: "$container_nos.arrival_date",
                            container_number: "$container_nos.container_number"
                        }
                    }
                ],
                rail_out_today: [
                    { $unwind: "$container_nos" },
                    {
                        $match: {
                            "container_nos.container_rail_out_date": { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: {
                            job_no: 1, importer: 1, shipping_line_airline: 1,
                            relevant_date: "$container_nos.container_rail_out_date",
                            container_number: "$container_nos.container_number"
                        }
                    }
                ],
                be_filed: [
                    {
                        $match: {
                            be_date: { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$be_date" }
                    }
                ],
                ooc: [
                    {
                        $match: {
                            out_of_charge: { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$out_of_charge" }
                    }
                ],
                do_completed: [
                    {
                        $match: {
                            do_completed: { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$do_completed" }
                    }
                ],
                billing_sent: [
                    {
                        $match: {
                            bill_document_sent_to_accounts: { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$bill_document_sent_to_accounts" }
                    }
                ],
                eta: [
                    {
                        $match: {
                            vessel_berthing: { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$vessel_berthing" }
                    }
                ]
            }
        },
        {
            $project: {
                summary: {
                    jobs_created_today: { $size: "$jobs_created_today" },
                    operations_completed: { $size: "$operations_completed" },
                    examination_planning: { $size: "$examination_planning" },
                    arrivals_today: { $size: "$arrivals_today" },
                    rail_out_today: { $size: "$rail_out_today" },
                    be_filed: { $size: "$be_filed" },
                    ooc: { $size: "$ooc" },
                    do_completed: { $size: "$do_completed" },
                    billing_sent: { $size: "$billing_sent" },
                    eta: { $size: "$eta" }
                },
                details: {
                    jobs_created_today: "$jobs_created_today",
                    jobs_trend: "$jobs_trend",
                    ops_trend: "$ops_trend",
                    operations_completed: "$operations_completed",
                    examination_planning: "$examination_planning",
                    arrivals_today: "$arrivals_today",
                    rail_out_today: "$rail_out_today",
                    be_filed: "$be_filed",
                    ooc: "$ooc",
                    do_completed: "$do_completed",
                    billing_sent: "$billing_sent",
                    eta: "$eta"
                }
            }
        }
    ];
};

// 🚢 Movement Pipeline
const getMovementPipeline = (start, end) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    // All metrics count containers
    const makeContainerFacet = (field) => [
        { $unwind: "$container_nos" },
        { $match: { [`container_nos.${field}`]: { $gte: toYMD(start), $lte: end.toISOString() } } },
        {
            $project: {
                job_no: 1, importer: 1, shipping_line_airline: 1,
                relevant_date: `$container_nos.${field}`,
                container_number: "$container_nos.container_number"
            }
        }
    ];

    return [
        {
            $facet: {
                arrived: makeContainerFacet("arrival_date"),
                rail_out: makeContainerFacet("container_rail_out_date"),
                delivered: makeContainerFacet("delivery_date"),
                empty_offload: makeContainerFacet("emptyContainerOffLoadDate"),
                by_road: makeContainerFacet("by_road_movement_date"),
                detention_start: makeContainerFacet("detention_from"),
                // Trends
                arrival_trend: [
                    { $unwind: "$container_nos" },
                    { $match: { "container_nos.arrival_date": { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: { $substr: ["$container_nos.arrival_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    arrived: { $size: "$arrived" },
                    rail_out: { $size: "$rail_out" },
                    delivered: { $size: "$delivered" },
                    empty_offload: { $size: "$empty_offload" },
                    by_road: { $size: "$by_road" },
                    detention_start: { $size: "$detention_start" }
                },
                details: "$$ROOT"
            }
        }
    ];
};

// 🏛 Customs Pipeline
const getCustomsPipeline = (start, end) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() } } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    return [
        {
            $facet: {
                igm: makeJobFacet("igm_date"),
                gateway_igm: makeJobFacet("gateway_igm_date"),
                be_filed: makeJobFacet("be_date"),
                assessment: makeJobFacet("assessment_date"),
                duty_paid: makeJobFacet("duty_paid_date"),
                pcv: makeJobFacet("pcv_date"),
                ooc: makeJobFacet("out_of_charge"),
                discharge: makeJobFacet("discharge_date"),
                // Add trend data for BE and OOC
                be_trend: [
                    { $match: { be_date: { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: "$be_date", count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                ooc_trend: [
                    { $match: { out_of_charge: { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: { $substr: ["$out_of_charge", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    igm: { $size: "$igm" },
                    gateway_igm: { $size: "$gateway_igm" },
                    be_filed: { $size: "$be_filed" },
                    assessment: { $size: "$assessment" },
                    duty_paid: { $size: "$duty_paid" },
                    pcv: { $size: "$pcv" },
                    ooc: { $size: "$ooc" },
                    discharge: { $size: "$discharge" }
                },
                details: {
                    igm: "$igm", gateway_igm: "$gateway_igm", be_filed: "$be_filed", assessment: "$assessment",
                    duty_paid: "$duty_paid", pcv: "$pcv", ooc: "$ooc", discharge: "$discharge",
                    be_trend: "$be_trend", ooc_trend: "$ooc_trend"
                }
            }
        }
    ];
};

// 📄 Documentation Pipeline
const getDocumentationPipeline = (start, end) => {
    // Calculate 7 days ago for trend
    // Note: Documentation fields are ISO-like timestamps (YYYY-MM-DDTHH:mm), so we use ISO strings for range.
    // However, for trends grouping, we need to extract YYYY-MM-DD.

    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo); // YYYY-MM-DD
    // But since we match against timestamp fields, we might need full ISO for trend match?
    // Actually, simple string match works: "2025-12-13T..." >= "2025-12-13" (True).
    // And "2025-12-20T..." <= "2025-12-20" (False).
    // So for trend range (which covers last 7 days including today), we should use a broad range.
    // "2025-12-13" to "2025-12-21" (tomorrow)? Or today's end?

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() } } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    return [
        {
            $facet: {
                checklist_approved: makeJobFacet("is_checklist_aprroved_date"),
                docs_received: makeJobFacet("document_received_date"),
                documentation_completed: makeJobFacet("documentation_completed_date_time"),
                esanchit_completed: makeJobFacet("esanchit_completed_date_time"),
                submission_completed: makeJobFacet("submission_completed_date_time"),
                // Trend
                docs_trend: [
                    { $match: { documentation_completed_date_time: { $gte: sevenDaysAgo.toISOString(), $lte: todayEnd.toISOString() } } },
                    { $group: { _id: { $substr: ["$documentation_completed_date_time", 0, 10] }, count: { $sum: 1 } } }, // Extract YYYY-MM-DD
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    checklist_approved: { $size: "$checklist_approved" },
                    docs_received: { $size: "$docs_received" },
                    documentation_completed: { $size: "$documentation_completed" },
                    esanchit_completed: { $size: "$esanchit_completed" },
                    submission_completed: { $size: "$submission_completed" }
                },
                details: "$$ROOT"
            }
        }
    ];
};

// 📦 DoManagement Pipeline
const getDoManagementPipeline = (start, end) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() } } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // special handling for container do expiry
    const containerExpiryFacet = [
        { $unwind: "$container_nos" },
        { $match: { "container_nos.do_validity_upto_container_level": { $gte: toYMD(start), $lte: end.toISOString() } } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$container_nos.do_validity_upto_container_level", container_number: "$container_nos.container_number" } }
    ];

    return [
        {
            $facet: {
                do_planned: makeJobFacet("do_planning_date"),
                do_prepared: makeJobFacet("do_doc_prepared_date"),
                do_received: makeJobFacet("do_doc_recieved_date"),
                do_completed: makeJobFacet("do_completed"),
                do_revalidated: makeJobFacet("do_revalidation_date"),
                do_expiring_job: makeJobFacet("do_validity_upto_job_level"),
                container_do_expiry: containerExpiryFacet,
                // Trend
                do_trend: [
                    { $match: { do_completed: { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: { $substr: ["$do_completed", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    do_planned: { $size: "$do_planned" },
                    do_prepared: { $size: "$do_prepared" },
                    do_received: { $size: "$do_received" },
                    do_completed: { $size: "$do_completed" },
                    do_revalidated: { $size: "$do_revalidated" },
                    do_expiring_job: { $size: "$do_expiring_job" },
                    container_do_expiry: { $size: "$container_do_expiry" },
                },
                details: "$$ROOT"
            }
        }
    ];
};

// 💰 Billing Pipeline
const getBillingPipeline = (start, end) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = toYMD(new Date());

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: toYMD(end) } } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    return [
        {
            $facet: {
                billing_sheet_sent: makeJobFacet("bill_document_sent_to_accounts"),
                bill_generated: makeJobFacet("bill_date"), // If comma separated, this might miss.
                operation_completed: makeJobFacet("completed_operation_date"),
                payment_made: makeJobFacet("payment_made_date"),
                // Trend
                billing_trend: [
                    { $match: { bill_document_sent_to_accounts: { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: { $substr: ["$bill_document_sent_to_accounts", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    billing_sheet_sent: { $size: "$billing_sheet_sent" },
                    bill_generated: { $size: "$bill_generated" },
                    operation_completed: { $size: "$operation_completed" },
                    payment_made: { $size: "$payment_made" }
                },
                details: "$$ROOT"
            }
        }
    ];
};

// 🚨 Exceptions Pipeline
const getExceptionsPipeline = (start, end) => {
    // DO validity today/expired: do_validity_upto_job_level <= today (or selected range?)
    // "Show alerts using existing fields: DO validity today/expired"
    // I'll assume it matches the range (expired within this range).

    const today = new Date().toISOString().split('T')[0];

    return [
        {
            $facet: {
                do_validity_expired: [
                    {
                        $match: {
                            do_validity_upto_job_level: { $lte: today, $ne: null } // Expired
                        }
                    },
                    { $project: { job_no: 1, importer: 1, relevant_date: "$do_validity_upto_job_level" } }
                ],
                containers_in_detention: [
                    { $unwind: "$container_nos" },
                    {
                        $match: {
                            "container_nos.detention_from": { $lte: today, $ne: null }
                        }
                    },
                    { $project: { job_no: 1, container_number: "$container_nos.container_number", relevant_date: "$container_nos.detention_from" } }
                ],
                pending_billing: [
                    {
                        $match: {
                            bill_document_sent_to_accounts: { $exists: false },
                            detailed_status: "Completed" // "status = Completed"
                        }
                    },
                    { $project: { job_no: 1, importer: 1 } }
                ],
                // Jobs with status != Completed beyond selected range?
                // The logic "Jobs with status != Completed beyond selected range" is tricky.
                // Maybe "Jobs created before start date but not completed"?
                incomplete_jobs: [
                    {
                        $match: {
                            detailed_status: { $ne: "Completed" },
                            job_date: { $lt: start.toISOString() }
                        }
                    },
                    { $project: { job_no: 1, importer: 1, relevant_date: "$job_date" } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    do_validity_expired: { $size: "$do_validity_expired" },
                    containers_in_detention: { $size: "$containers_in_detention" },
                    pending_billing: { $size: "$pending_billing" },
                    incomplete_jobs: { $size: "$incomplete_jobs" }
                },
                details: "$$ROOT"
            }
        }
    ];
};

export default router;
