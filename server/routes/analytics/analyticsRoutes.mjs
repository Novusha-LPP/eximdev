import express from "express";
// JobModel is now attached to req by branchJobMiddleware
import mongoose from "mongoose";

const router = express.Router();

// Helper to parse dates
const parseDate = (d) => new Date(d);

router.get("/api/analytics/:module", async (req, res) => {
    try {
        // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
        const JobModel = req.JobModel;

        const { module } = req.params;
        let { startDate, endDate, importer } = req.query;

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
                pipeline = getOverviewPipeline(start, end, importer);
                break;
            case "movement":
                pipeline = getMovementPipeline(start, end, importer);
                break;
            case "customs":
                pipeline = getCustomsPipeline(start, end, importer);
                break;
            case "documentation":
                pipeline = getDocumentationPipeline(start, end, importer);
                break;
            case "do-management":
                pipeline = getDoManagementPipeline(start, end, importer);
                break;
            case "esanchit":
                pipeline = getESanchitPipeline(start, end, importer);
                break;
            case "operations":
                pipeline = getOperationsPipeline(start, end, importer);
                break;
            case "submission":
                pipeline = getSubmissionPipeline(start, end, importer);
                break;
            case "billing":
                pipeline = getBillingPipeline(start, end, importer);
                break;
            case "exceptions":
                pipeline = getExceptionsPipeline(start, end, importer);
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
const getOverviewPipeline = (start, end, importer) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};

    return [
        {
            $facet: {
                jobs_created_today: [
                    {
                        $match: {
                            job_date: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...importerMatch
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
                            completed_operation_date: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...importerMatch
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$completed_operation_date" }
                    }
                ],
                examination_planning: [
                    { $match: { examination_planning_date: { $gte: toYMD(start), $lte: end.toISOString() }, ...importerMatch } },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$examination_planning_date" } }
                ],
                jobs_trend: [
                    { $match: { job_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$job_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                ops_trend: [
                    { $match: { completed_operation_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$completed_operation_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                exam_trend: [
                    { $match: { examination_planning_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$examination_planning_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                arrival_trend: [
                    { $match: { ...importerMatch } },
                    { $unwind: "$container_nos" },
                    { $match: { "container_nos.arrival_date": { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: { $substr: ["$container_nos.arrival_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                rail_out_trend: [
                    { $match: { ...importerMatch } },
                    { $unwind: "$container_nos" },
                    { $match: { "container_nos.container_rail_out_date": { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: { $substr: ["$container_nos.container_rail_out_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                be_trend: [
                    { $match: { be_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$be_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                ooc_trend: [
                    { $match: { out_of_charge: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$out_of_charge", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                do_trend: [
                    { $match: { do_completed: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$do_completed", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                billing_trend: [
                    { $match: { bill_document_sent_to_accounts: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$bill_document_sent_to_accounts", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                eta_trend: [
                    { $match: { vessel_berthing: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$vessel_berthing", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                gateway_igm_trend: [
                    { $match: { gateway_igm_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$gateway_igm_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                discharge_trend: [
                    { $match: { discharge_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$discharge_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                arrivals_today: [
                    { $match: { ...importerMatch } },
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
                    { $match: { ...importerMatch } },
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
                            be_date: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...importerMatch
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$be_date", processed_be_attachment: 1 }
                    }
                ],
                ooc: [
                    {
                        $match: {
                            out_of_charge: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...importerMatch
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$out_of_charge", ooc_copies: 1 }
                    }
                ],
                do_completed: [
                    {
                        $match: {
                            do_completed: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...importerMatch
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$do_completed" }
                    }
                ],
                billing_sent: [
                    {
                        $match: {
                            bill_document_sent_to_accounts: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...importerMatch
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$bill_document_sent_to_accounts" }
                    }
                ],
                eta: [
                    {
                        $match: {
                            vessel_berthing: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...importerMatch
                        }
                    },
                    {
                        $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$vessel_berthing" }
                    }
                ],
                gateway_igm_date: [
                    { $match: { gateway_igm_date: { $gte: toYMD(start), $lte: end.toISOString() }, ...importerMatch } },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$gateway_igm_date" } }
                ],
                discharge_date: [
                    { $match: { discharge_date: { $gte: toYMD(start), $lte: end.toISOString() }, ...importerMatch } },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$discharge_date" } }
                ],
                empty_offload: [
                    { $match: { ...importerMatch } },
                    { $unwind: "$container_nos" },
                    { $match: { "container_nos.emptyContainerOffLoadDate": { $gte: toYMD(start), $lte: end.toISOString() } } },
                    {
                        $project: {
                            job_no: 1, importer: 1, shipping_line_airline: 1,
                            relevant_date: "$container_nos.emptyContainerOffLoadDate",
                            container_number: "$container_nos.container_number"
                        }
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
                    eta: { $size: "$eta" },
                    gateway_igm_date: { $size: "$gateway_igm_date" },
                    discharge_date: { $size: "$discharge_date" },
                    empty_offload: { $size: "$empty_offload" }
                },
                details: {
                    jobs_created_today: "$jobs_created_today",
                    jobs_trend: "$jobs_trend",
                    ops_trend: "$ops_trend",
                    exam_trend: "$exam_trend",
                    arrival_trend: "$arrival_trend",
                    rail_out_trend: "$rail_out_trend",
                    be_trend: "$be_trend",
                    ooc_trend: "$ooc_trend",
                    do_trend: "$do_trend",
                    billing_trend: "$billing_trend",
                    eta_trend: "$eta_trend",
                    gateway_igm_trend: "$gateway_igm_trend",
                    discharge_trend: "$discharge_trend",
                    operations_completed: "$operations_completed",
                    examination_planning: "$examination_planning",
                    arrivals_today: "$arrivals_today",
                    rail_out_today: "$rail_out_today",
                    be_filed: "$be_filed",
                    ooc: "$ooc",
                    do_completed: "$do_completed",
                    billing_sent: "$billing_sent",
                    eta: "$eta",
                    gateway_igm_date: "$gateway_igm_date",
                    discharge_date: "$discharge_date",
                    empty_offload: "$empty_offload"
                }
            }
        }
    ];
};

// 🚢 Movement Pipeline
const getMovementPipeline = (start, end, importer) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};

    // All metrics count containers
    const makeContainerFacet = (field) => [
        { $match: { ...importerMatch } },
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
                detention_start: [
                    { $match: { ...importerMatch } },
                    { $unwind: "$container_nos" },
                    {
                        $match: {
                            "container_nos.detention_from": { $gte: toYMD(start), $lte: end.toISOString() },
                            $or: [
                                { "container_nos.emptyContainerOffLoadDate": { $exists: false } },
                                { "container_nos.emptyContainerOffLoadDate": "" },
                                { "container_nos.emptyContainerOffLoadDate": null }
                            ]
                        }
                    },
                    {
                        $project: {
                            job_no: 1, importer: 1, shipping_line_airline: 1,
                            relevant_date: `$container_nos.detention_from`,
                            container_number: "$container_nos.container_number"
                        }
                    }
                ],
                // Trends
                arrival_trend: [
                    { $match: { ...importerMatch } },
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
const getCustomsPipeline = (start, end, importer) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...importerMatch } },
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
                    { $match: { be_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: "$be_date", count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                ooc_trend: [
                    { $match: { out_of_charge: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
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
const getDocumentationPipeline = (start, end, importer) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const importerMatch = importer ? { importer: importer } : {};

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...importerMatch } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // Pending Documentation Logic (Snapshot)
    const pendingDocsMatch = {
        $and: [
            importerMatch,
            { status: { $regex: /^pending$/i } },
            { job_no: { $ne: null } },
            { be_no: { $exists: true, $ne: "", $not: { $regex: "^cancelled$", $options: "i" } } },
            {
                $or: [
                    { documentation_completed_date_time: { $exists: false } },
                    { documentation_completed_date_time: "" },
                    { documentation_completed_date_time: null }
                ]
            }
        ]
    };

    return [
        {
            $facet: {
                documentation_pending: [
                    { $match: pendingDocsMatch },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$job_date" } }
                ],
                documentation_completed: makeJobFacet("documentation_completed_date_time"),
                // Trend
                docs_trend: [
                    { $match: { documentation_completed_date_time: { $gte: sevenDaysAgo.toISOString(), $lte: todayEnd.toISOString() }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$documentation_completed_date_time", 0, 10] }, count: { $sum: 1 } } }, // Extract YYYY-MM-DD
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    documentation_pending: { $size: "$documentation_pending" },
                    documentation_completed: { $size: "$documentation_completed" }
                },
                details: {
                    documentation_pending: "$documentation_pending",
                    documentation_completed: "$documentation_completed",
                    docs_trend: "$docs_trend"
                }
            }
        }
    ];
};

// 📦 DoManagement Pipeline
const getDoManagementPipeline = (start, end, importer) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...importerMatch } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // special handling for container do expiry
    const containerExpiryFacet = [
        { $match: { ...importerMatch } },
        { $unwind: "$container_nos" },
        { $match: { "container_nos.do_validity_upto_container_level": { $gte: toYMD(start), $lte: end.toISOString() } } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$container_nos.do_validity_upto_container_level", container_number: "$container_nos.container_number" } }
    ];

    // Invoice Criteria (Same as DO List)
    const invoiceCriteria = {
        $or: [
            { shipping_line_invoice_imgs: { $exists: true, $not: { $size: 0 } } },
            { icd_cfs_invoice_img: { $exists: true, $not: { $size: 0 } } },
            { concor_invoice_and_receipt_copy: { $exists: true, $not: { $size: 0 } } },
            { thar_invoices: { $exists: true, $not: { $size: 0 } } },
            { hasti_invoices: { $exists: true, $not: { $size: 0 } } },
            { other_invoices_img: { $exists: true, $not: { $size: 0 } } }
        ]
    };

    // "In List" logic (Pending DO Planning)
    const pendingDoMatch = {
        $and: [
            importerMatch,
            { job_no: { $ne: null } },
            { be_no: { $exists: true, $ne: "" } },
            { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
            {
                $or: [
                    { do_planning_date: { $exists: false } },
                    { do_planning_date: "" },
                    { do_planning_date: null }
                ]
            },
            // Logic to ensure it's strictly "in list" (not moved to next stages)
            { $or: [{ shipping_line_bond_completed_date: { $exists: false } }, { shipping_line_bond_completed_date: "" }] },
            { $or: [{ shipping_line_kyc_completed_date: { $exists: false } }, { shipping_line_kyc_completed_date: "" }] },
            { $or: [{ shipping_line_invoice_received_date: { $exists: false } }, { shipping_line_invoice_received_date: "" }] },
            { $or: [{ bill_date: { $exists: false } }, { bill_date: "" }] }
        ]
    };

    return [
        {
            $facet: {
                do_planned: makeJobFacet("do_planning_date"),
                do_received: makeJobFacet("do_doc_recieved_date"),
                do_completed: makeJobFacet("do_completed"),
                do_revalidated: makeJobFacet("do_revalidation_date"),
                do_expiring_job: [
                    {
                        $match: {
                            do_validity_upto_job_level: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...importerMatch,
                            $or: [
                                { do_completed: { $exists: false } },
                                { do_completed: "" },
                                { do_completed: null }
                            ]
                        }
                    },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$do_validity_upto_job_level" } }
                ],
                // New Facets - using strict "In List" logic without date range
                jobs_with_invoices: [
                    { $match: { $and: [...pendingDoMatch.$and, invoiceCriteria] } },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$job_date" } }
                ],
                jobs_without_invoices: [
                    { $match: { $and: [...pendingDoMatch.$and, { $node: invoiceCriteria.$or }] } },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$job_date" } }
                ],
                // Trend
                do_trend: [
                    { $match: { do_completed: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$do_completed", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    do_planned: { $size: "$do_planned" },
                    do_received: { $size: "$do_received" },
                    do_completed: { $size: "$do_completed" },
                    do_revalidated: { $size: "$do_revalidated" },
                    do_expiring_job: { $size: "$do_expiring_job" },
                    jobs_with_invoices: { $size: "$jobs_with_invoices" },
                    jobs_without_invoices: { $size: "$jobs_without_invoices" },
                },
                details: "$$ROOT"
            }
        }
    ];
};

// 💰 Billing Pipeline
const getBillingPipeline = (start, end, importer) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...importerMatch } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // Facet for nested invoice dates
    const makeInvoiceFacet = (field) => [
        { $match: { ...importerMatch } },
        { $unwind: "$do_shipping_line_invoice" },
        { $match: { [`do_shipping_line_invoice.${field}`]: { $gte: toYMD(start), $lte: end.toISOString() } } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$do_shipping_line_invoice.${field}` } }
    ];

    return [
        {
            $facet: {
                billing_sheet_sent: makeJobFacet("bill_document_sent_to_accounts"),
                payment_requested: makeInvoiceFacet("payment_request_date"),
                payment_made: makeInvoiceFacet("payment_made_date"),
                // Trend
                billing_trend: [
                    { $match: { bill_document_sent_to_accounts: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$bill_document_sent_to_accounts", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    billing_sheet_sent: { $size: "$billing_sheet_sent" },
                    payment_requested: { $size: "$payment_requested" },
                    payment_made: { $size: "$payment_made" }
                },
                details: "$$ROOT"
            }
        }
    ];
};

// 🚨 Exceptions Pipeline
const getExceptionsPipeline = (start, end, importer) => {
    const today = new Date().toISOString().split('T')[0];

    const importerMatch = importer ? { importer: importer } : {};

    return [
        {
            $facet: {
                do_validity_expired: [
                    {
                        $match: {
                            do_validity_upto_job_level: { $lte: today, $ne: null }, // Expired
                            ...importerMatch
                        }
                    },
                    { $project: { job_no: 1, importer: 1, relevant_date: "$do_validity_upto_job_level" } }
                ],
                containers_in_detention: [
                    { $match: { ...importerMatch } },
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
                            detailed_status: "Completed", // "status = Completed"
                            ...importerMatch
                        }
                    },
                    { $project: { job_no: 1, importer: 1 } }
                ],
                incomplete_jobs: [
                    {
                        $match: {
                            detailed_status: { $ne: "Completed" },
                            job_date: { $lt: start.toISOString() },
                            ...importerMatch
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

// ⚡ E-Sanchit Pipeline
const getESanchitPipeline = (start, end, importer) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...importerMatch } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // Pending Logic: Matches getESanchitJobs.mjs "current pending" state
    const pendingEsanchitMatch = {
        $and: [
            importerMatch,
            { status: { $regex: /^pending$/i } },
            { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
            { job_no: { $ne: null } },
            { out_of_charge: { $eq: "" } },
            { cth_documents: { $elemMatch: { is_sent_to_esanchit: true } } },
            {
                $or: [
                    { esanchit_completed_date_time: { $exists: false } },
                    { esanchit_completed_date_time: "" },
                    { esanchit_completed_date_time: null },
                ]
            }
        ]
    };

    return [
        {
            $facet: {
                esanchit_pending: [
                    { $match: pendingEsanchitMatch },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$job_date" } } // Use job_date as ref
                ],
                esanchit_completed: makeJobFacet("esanchit_completed_date_time"),
                // Trend
                esanchit_trend: [
                    { $match: { esanchit_completed_date_time: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$esanchit_completed_date_time", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    esanchit_pending: { $size: "$esanchit_pending" },
                    esanchit_completed: { $size: "$esanchit_completed" }
                },
                details: {
                    esanchit_pending: "$esanchit_pending",
                    esanchit_completed: "$esanchit_completed",
                    esanchit_trend: "$esanchit_trend"
                }
            }
        }
    ];
};

// ⚙️ Operations Pipeline
const getOperationsPipeline = (start, end, importer) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...importerMatch } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    const pendingOpsBase = {
        $and: [
            importerMatch,
            { status: { $regex: /^Pending$/i } },
            { be_no: { $exists: true, $ne: null, $ne: "", $not: /cancelled/i } },
            {
                $or: [
                    { completed_operation_date: { $exists: false } },
                    { completed_operation_date: "" }
                ]
            }
        ]
    };

    // "In Examination Planning" specifically
    const inExamPlanningMatch = {
        $and: [
            ...pendingOpsBase.$and,
            { examination_planning_date: { $exists: true, $nin: ["", null] } },
            // not moved to PCV or OOC yet
            { $or: [{ pcv_date: { $exists: false } }, { pcv_date: "" }] },
            { $or: [{ out_of_charge: { $exists: false } }, { out_of_charge: "" }, { out_of_charge: false }] }
        ]
    };

    return [
        {
            $facet: {
                in_examination_planning: [
                    { $match: inExamPlanningMatch },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$examination_planning_date" } }
                ],
                operations_completed: makeJobFacet("completed_operation_date"),
                // Trend
                ops_trend: [
                    { $match: { completed_operation_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$completed_operation_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    in_examination_planning: { $size: "$in_examination_planning" },
                    operations_completed: { $size: "$operations_completed" }
                },
                details: {
                    in_examination_planning: "$in_examination_planning",
                    operations_completed: "$operations_completed",
                    ops_trend: "$ops_trend"
                }
            }
        }
    ];
};

// 📤 Submission Pipeline
const getSubmissionPipeline = (start, end, importer) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...importerMatch } },
        { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // Pending Submission Logic (Snapshot)
    const pendingSubmissionMatch = {
        $and: [
            importerMatch,
            { status: { $regex: /^pending$/i } },
            { job_no: { $ne: null } },
            {
                $or: [
                    { submission_completed_date_time: { $exists: false } },
                    { submission_completed_date_time: "" },
                    { submission_completed_date_time: null }
                ]
            },
            {
                $or: [
                    // FCL Prerequisites
                    {
                        $and: [
                            { consignment_type: "FCL" },
                            { documentation_completed_date_time: { $exists: true, $ne: "" } },
                            { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                            { discharge_date: { $exists: true, $ne: "" } },
                            { gateway_igm_date: { $exists: true, $ne: "" } },
                            { gateway_igm: { $exists: true, $ne: "" } },
                            { igm_no: { $exists: true, $ne: "" } },
                            { igm_date: { $exists: true, $ne: "" } },
                            { is_checklist_aprroved: { $exists: true, $ne: false } }
                        ]
                    },
                    // LCL Prerequisites
                    {
                        $and: [
                            { consignment_type: "LCL" },
                            { documentation_completed_date_time: { $exists: true, $ne: "" } },
                            { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                            { is_checklist_aprroved: { $exists: true, $ne: false } }
                        ]
                    }
                ]
            }
        ]
    };

    return [
        {
            $facet: {
                submission_pending: [
                    { $match: pendingSubmissionMatch },
                    { $project: { job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$job_date" } }
                ],
                submission_completed: makeJobFacet("submission_completed_date_time"),
                // Trend
                submission_trend: [
                    { $match: { submission_completed_date_time: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...importerMatch } },
                    { $group: { _id: { $substr: ["$submission_completed_date_time", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    submission_pending: { $size: "$submission_pending" },
                    submission_completed: { $size: "$submission_completed" }
                },
                details: {
                    submission_pending: "$submission_pending",
                    submission_completed: "$submission_completed",
                    submission_trend: "$submission_trend"
                }
            }
        }
    ];
};

export default router;
