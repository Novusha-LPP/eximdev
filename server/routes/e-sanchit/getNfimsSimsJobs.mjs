import express from "express";
import JobModel from "../../model/jobModel.mjs";
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";
import { getBranchMatch } from "../../utils/branchFilter.mjs";

const router = express.Router();

// Function to build the search query
const buildSearchQuery = (search) => ({
    $or: [
        { job_no: { $regex: search, $options: "i" } },
        { year: { $regex: search, $options: "i" } },
        { importer: { $regex: search, $options: "i" } },
        { custom_house: { $regex: search, $options: "i" } },
        { consignment_type: { $regex: search, $options: "i" } },
        { type_of_b_e: { $regex: search, $options: "i" } },
        { awb_bl_no: { $regex: search, $options: "i" } },
        { "container_nos.container_number": { $regex: search, $options: "i" } },
    ],
});

router.get("/api/get-nfims-sims-jobs", applyUserIcdFilter, async (req, res) => {
    const { page = 1, limit = 100, search = "", importer, year, branchId, category } = req.query;

    const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const selectedYear = year ? year.toString() : null;

    if (isNaN(pageNumber) || pageNumber < 1) {
        return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
        return res.status(400).json({ message: "Invalid limit value" });
    }

    try {
        const skip = (pageNumber - 1) * limitNumber;

        const baseQuery = {
            $and: [
                {
                    charges: {
                        $elemMatch: {
                            chargeHead: {
                                $in: [
                                    "NFMIMS APPLICATION FEES",
                                    "NFMIMS REGISTRATION CHARGES",
                                    "SIMS APPLICATION FEES",
                                    "SIMS REGISTRATION CHARGES"
                                ]
                            },
                            payment_request_status: { $ne: "Paid" }
                        }
                    }
                }
            ],
        };

        if (search && search.trim()) {
            baseQuery.$and.push(buildSearchQuery(search.trim()));
        }

        if (selectedYear) {
            baseQuery.$and.push({ year: selectedYear });
        }

        if (decodedImporter && decodedImporter !== "Select Importer") {
            baseQuery.$and.push({
                importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
            });
        }

        const branchMatch = getBranchMatch(branchId, category, req.authorizedBranchIds);
        baseQuery.$and.push(branchMatch);

        if (req.userIcdFilter) {
            baseQuery.$and.push(req.userIcdFilter);
        }

        const totalJobs = await JobModel.countDocuments(baseQuery);
        const jobs = await JobModel.find(baseQuery)
            .select(
                "priorityJob detailed_status esanchit_completed_date_time status out_of_charge be_no job_number job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no container_nos irn charges mode branch_code trade_type"
            )
            .sort({ gateway_igm_date: 1 })
            .skip(skip)
            .limit(limitNumber);

        res.status(200).json({
            totalJobs,
            totalPages: Math.ceil(totalJobs / limitNumber),
            currentPage: pageNumber,
            jobs: jobs,
        });

    } catch (err) {
        console.error("Error fetching NFIMS/SIMS jobs:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
