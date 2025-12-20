import express from "express";
import BondFormatModel from "../../model/bondFormatModel.mjs";
import ImporterBondModel from "../../model/importerBondModel.mjs";
import JobModel from "../../model/jobModel.mjs";
import ImporterModel from "../../model/importerSchemaModel.mjs";

const router = express.Router();

// Get importer details for variable insertion
router.get("/api/get-importer-details/:name", async (req, res) => {
    try {
        const name = req.params.name.trim();
        const [importer, lastJob] = await Promise.all([
            ImporterModel.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } }),
            JobModel.findOne({ importer: { $regex: new RegExp(`^${name}$`, "i") } }).sort({ createdAt: -1 })
        ]);

        res.status(200).json({
            importer: name,
            address: importer?.address || lastJob?.importer_address || "",
            ie_code_no: lastJob?.ie_code_no || "",
            contact: importer?.contact || "",
            email: importer?.email || "",
            bank_name: lastJob?.bank_name || "",
            ad_code: lastJob?.adCode || "",
            bl_no: lastJob?.awb_bl_no || "",
            gross_weight: lastJob?.gross_weight || "",
            packages: lastJob?.no_of_pkgs || "",
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get bond format by shipping line
router.get("/api/bond-format/:shippingLine", async (req, res) => {
    try {
        const { shippingLine } = req.params;
        const format = await BondFormatModel.findOne({ shippingLine });
        res.status(200).json(format || { content: "" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get importer bond details
router.get("/api/importer-bond/:shippingLine/:importer", async (req, res) => {
    try {
        const { shippingLine, importer } = req.params;
        const record = await ImporterBondModel.findOne({ shippingLine, importer });
        res.status(200).json(record || { fileUrl: "", validityDate: "" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create/Update bond format (Shared Template)
router.post("/api/bond-format", async (req, res) => {
    try {
        const { shippingLine, content } = req.body;
        const format = await BondFormatModel.findOneAndUpdate(
            { shippingLine },
            { content },
            { upsert: true, new: true }
        );
        res.status(200).json(format);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create/Update importer bond details (Specific Upload/Validity)
router.post("/api/importer-bond", async (req, res) => {
    try {
        const { shippingLine, importer, fileUrl, validityDate } = req.body;
        const record = await ImporterBondModel.findOneAndUpdate(
            { shippingLine, importer },
            { fileUrl, validityDate },
            { upsert: true, new: true }
        );
        res.status(200).json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all unique importers
router.get("/api/get-all-importers", async (req, res) => {
    try {
        const importers = await JobModel.aggregate([
            {
                $group: {
                    _id: "$importer",
                },
            },
            {
                $project: {
                    _id: 0,
                    importer: "$_id",
                },
            },
            { $match: { importer: { $ne: null, $ne: "" } } },
            { $sort: { importer: 1 } },
        ]);
        res.status(200).json(importers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
