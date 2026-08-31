import mongoose from "mongoose";
import Audit5sTemplateModel from "../../model/audit5s/Audit5sTemplate.mjs";
import Audit5sZoneModel from "../../model/audit5s/Audit5sZone.mjs";
import Audit5sChecklistModel from "../../model/audit5s/Audit5sChecklist.mjs";
import UserModel from "../../model/userModel.mjs";

const DEFAULT_CATEGORIES = [
    {
        name: "1S Sort 1S (Seiri)",
        subName: "Organization",
        items: [
            { text: "Are all unnecessary tools, equipment, and materials removed?" },
            { text: "Are old files, documents, forms, and outdated posters removed?" },
            { text: "Is the red-tag area available and managed regularly?" },
            { text: "Are disposal bins provided and labeled?" }
        ]
    },
    {
        name: "2S Set in Order 2S (Seiton)",
        subName: "Orderliness",
        items: [
            { text: "Are storage locations clearly defined and labeled?" },
            { text: "Are tools/equipment placed according to frequency of use?" },
            { text: "Are floor markings and visual aids used effectively?" },
            { text: "Are items returned to their designated place after use?" },
            { text: "Are cables and hoses neatly arranged or secured?" }
        ]
    },
    {
        name: "3S Shine 3S (Seiso)",
        subName: "Cleanliness",
        items: [
            { text: "Are work areas cleaned at the start/end of shifts?" },
            { text: "Are cleaning tools available, labeled, and stored properly?" },
            { text: "Are machines/equipment cleaned and inspected regularly?" },
            { text: "Is there no evidence of oil leaks, dirt, or dust buildup?" },
            { text: "Are light fixtures clean and functioning?" }
        ]
    },
    {
        name: "4S Standardize 4S (Seiketsu)",
        subName: "Adherence",
        items: [
            { text: "Are standard work instructions updated and followed?" },
            { text: "Are visual standards (labels, color codes, signs) consistent across areas?" },
            { text: "Are regular 5S training and refreshers provided?" },
            { text: "Are best practices shared across departments?" }
        ]
    },
    {
        name: "5S Sustain 5S (Shitsuke)",
        subName: "Self Decipline",
        items: [
            { text: "Are 5S practices maintained consistently over time?" },
            { text: "Do team members show ownership of their work areas?" },
            { text: "Are audit results posted and communicated clearly?" }
        ]
    }
];

const DEFAULT_ZONES = [
    { zoneNo: "01", zoneName: "SECURITY AREA", leader: "ramdev" }
];

/**
 * Seeding helper to create default template if missing
 */
async function getOrSeedTemplate() {
    let template = await Audit5sTemplateModel.findOne();
    if (!template) {
        template = new Audit5sTemplateModel({
            docNo: "RI/QAD/R/04",
            revNo: "00",
            revDate: new Date("2024-12-10"),
            categories: DEFAULT_CATEGORIES
        });
        await template.save();
    }
    return template;
}

/**
 * Seeding helper to create default zones matching Organisation Chart
 */
async function seedDefaultZones() {
    const defaultUser = await UserModel.findOne({ isActive: { $ne: false } });
    if (!defaultUser) return;

    const template = await getOrSeedTemplate();

    for (const def of DEFAULT_ZONES) {
        let user = await UserModel.findOne({
            username: new RegExp(def.leader, "i"),
            isActive: { $ne: false }
        });
        if (!user) {
            user = await UserModel.findOne({
                first_name: new RegExp(def.leader, "i"),
                isActive: { $ne: false }
            });
        }

        const assignedUser = user ? user._id : defaultUser._id;

        let existingZone = await Audit5sZoneModel.findOne({ zoneNo: def.zoneNo });
        if (existingZone) {
            existingZone.isActive = true;
            existingZone.zoneName = def.zoneName;
            existingZone.responsiblePerson = assignedUser;
            if (!existingZone.categories || existingZone.categories.length === 0) {
                existingZone.categories = template.categories;
                existingZone.docNo = template.docNo;
                existingZone.revNo = template.revNo;
                existingZone.revDate = template.revDate;
            }
            await existingZone.save();
        } else {
            const newZone = new Audit5sZoneModel({
                zoneNo: def.zoneNo,
                zoneName: def.zoneName,
                responsiblePerson: assignedUser,
                categories: template.categories,
                docNo: template.docNo,
                revNo: template.revNo,
                revDate: template.revDate
            });
            await newZone.save();
        }
    }
}

// ─── Template Controllers (Zone-Specific) ───

export const getTemplate = async (req, res) => {
    try {
        const { zoneId } = req.query;

        if (!zoneId || zoneId === "undefined" || zoneId === "null" || !mongoose.Types.ObjectId.isValid(zoneId)) {
            // Default global template fallback
            const template = await getOrSeedTemplate();
            return res.status(200).json({ success: true, data: template });
        }

        const zone = await Audit5sZoneModel.findById(zoneId);
        if (!zone) {
            return res.status(404).json({ success: false, message: "Zone not found" });
        }

        // If the zone has no categories set up yet, initialize them from global template
        if (!zone.categories || zone.categories.length === 0) {
            const globalTpl = await getOrSeedTemplate();
            zone.categories = globalTpl.categories;
            zone.docNo = globalTpl.docNo;
            zone.revNo = globalTpl.revNo;
            zone.revDate = globalTpl.revDate;
            await zone.save();
        }

        res.status(200).json({
            success: true,
            data: {
                docNo: zone.docNo,
                revNo: zone.revNo,
                revDate: zone.revDate,
                categories: zone.categories
            }
        });
    } catch (error) {
        console.error("Error in getTemplate:", error);
        res.status(500).json({ success: false, message: "Failed to fetch template" });
    }
};

export const saveTemplate = async (req, res) => {
    try {
        const { zoneId, docNo, revNo, revDate, categories } = req.body;

        if (!zoneId) {
            return res.status(400).json({ success: false, message: "Zone ID is required to save template config" });
        }

        const zone = await Audit5sZoneModel.findById(zoneId);
        if (!zone) {
            return res.status(404).json({ success: false, message: "Zone not found" });
        }

        // Clean temporary client IDs to let MongoDB generate standard ObjectIds on save
        const cleanedCategories = (categories || []).map(cat => {
            const catCopy = { ...cat };
            if (catCopy._id && String(catCopy._id).startsWith("temp_")) {
                delete catCopy._id;
            }
            if (Array.isArray(catCopy.items)) {
                catCopy.items = catCopy.items.map(item => {
                    const itemCopy = { ...item };
                    if (itemCopy._id && String(itemCopy._id).startsWith("temp_")) {
                        delete itemCopy._id;
                    }
                    return itemCopy;
                });
            }
            return catCopy;
        });

        zone.docNo = docNo;
        zone.revNo = revNo;
        zone.revDate = revDate;
        zone.categories = cleanedCategories;

        await zone.save();

        // Synchronize doc control details to all existing checklists of this zone
        await Audit5sChecklistModel.updateMany(
            { zoneId: zone._id },
            {
                $set: {
                    docNo: docNo,
                    revNo: revNo,
                    revDate: revDate
                }
            }
        );

        res.status(200).json({ success: true, data: zone, message: "Zone template configuration saved successfully" });
    } catch (error) {
        console.error("Error in saveTemplate:", error);
        res.status(500).json({ success: false, message: "Failed to save template" });
    }
};

// ─── Zone Controllers ───

export const getZones = async (req, res) => {
    try {
        let zones = await Audit5sZoneModel.find({ isActive: true })
            .populate("responsiblePerson", "username first_name last_name email")
            .sort({ zoneNo: 1 });

        // Auto-seed if database contains zero active zones
        if (zones.length === 0) {
            await seedDefaultZones();
            zones = await Audit5sZoneModel.find({ isActive: true })
                .populate("responsiblePerson", "username first_name last_name email")
                .sort({ zoneNo: 1 });
        }

        res.status(200).json({ success: true, data: zones });
    } catch (error) {
        console.error("Error in getZones:", error);
        res.status(500).json({ success: false, message: "Failed to fetch zones" });
    }
};

export const saveZone = async (req, res) => {
    try {
        const { id, zoneNo, zoneName, responsiblePerson } = req.body;

        if (id) {
            // Edit existing
            const duplicate = await Audit5sZoneModel.findOne({ zoneNo, _id: { $ne: id } });
            if (duplicate) {
                return res.status(400).json({ success: false, message: `Zone number "${zoneNo}" is already in use.` });
            }

            const updated = await Audit5sZoneModel.findByIdAndUpdate(
                id,
                { zoneNo, zoneName, responsiblePerson },
                { new: true }
            ).populate("responsiblePerson", "username first_name last_name email");

            res.status(200).json({ success: true, data: updated, message: "Zone updated successfully" });
        } else {
            // Create new, check if a zone with this zoneNo already exists (active or inactive)
            let existing = await Audit5sZoneModel.findOne({ zoneNo });
            if (existing) {
                if (existing.isActive) {
                    return res.status(400).json({ success: false, message: `Zone number "${zoneNo}" is already in use.` });
                } else {
                    // Reactivate and update the inactive zone
                    existing.isActive = true;
                    existing.zoneName = zoneName;
                    existing.responsiblePerson = responsiblePerson;
                    await existing.save();

                    const populated = await Audit5sZoneModel.findById(existing._id)
                        .populate("responsiblePerson", "username first_name last_name email");
                    return res.status(200).json({ success: true, data: populated, message: "Zone reactivated and updated successfully" });
                }
            }

            // Copy categories from default global template
            const template = await getOrSeedTemplate();

            const newZone = new Audit5sZoneModel({
                zoneNo,
                zoneName,
                responsiblePerson,
                categories: template.categories,
                docNo: template.docNo,
                revNo: template.revNo,
                revDate: template.revDate
            });
            await newZone.save();
            const populated = await Audit5sZoneModel.findById(newZone._id)
                .populate("responsiblePerson", "username first_name last_name email");

            res.status(201).json({ success: true, data: populated, message: "Zone created successfully" });
        }
    } catch (error) {
        console.error("Error in saveZone:", error);
        res.status(500).json({ success: false, message: "Failed to save zone" });
    }
};

export const deleteZone = async (req, res) => {
    try {
        const { id } = req.params;
        await Audit5sZoneModel.findByIdAndUpdate(id, { isActive: false });
        res.status(200).json({ success: true, message: "Zone deleted successfully" });
    } catch (error) {
        console.error("Error in deleteZone:", error);
        res.status(500).json({ success: false, message: "Failed to delete zone" });
    }
};

export const getAllChecklists = async (req, res) => {
    try {
        const checklists = await Audit5sChecklistModel.find()
            .populate("responsiblePerson", "username first_name last_name email")
            .sort({ month: -1, zoneNo: 1 });
        res.status(200).json({ success: true, data: checklists });
    } catch (error) {
        console.error("Error in getAllChecklists:", error);
        res.status(500).json({ success: false, message: "Failed to fetch checklists list" });
    }
};

// ─── Checklist Controllers ───

export const getChecklist = async (req, res) => {
    try {
        const { month, zoneId } = req.query;

        if (!month || !zoneId) {
            return res.status(400).json({ success: false, message: "Month and Zone ID are required" });
        }

        if (zoneId === "undefined" || zoneId === "null" || !mongoose.Types.ObjectId.isValid(zoneId)) {
            return res.status(400).json({ success: false, message: "Invalid Zone ID format" });
        }

        // Find checklist
        let checklist = await Audit5sChecklistModel.findOne({ month, zoneId })
            .populate("responsiblePerson", "username first_name last_name email");

        // If not found, dynamically generate by copying the zone-specific template & details
        if (!checklist) {
            const zone = await Audit5sZoneModel.findById(zoneId);
            if (!zone || !zone.isActive) {
                return res.status(404).json({ success: false, message: "Active zone not found" });
            }

            // In case zone categories are unpopulated, clone from global template
            if (!zone.categories || zone.categories.length === 0) {
                const globalTpl = await getOrSeedTemplate();
                zone.categories = globalTpl.categories;
                zone.docNo = globalTpl.docNo;
                zone.revNo = globalTpl.revNo;
                zone.revDate = globalTpl.revDate;
                await zone.save();
            }

            // Extract all item IDs from all categories in the zone template
            const scores = [];
            zone.categories.forEach(cat => {
                cat.items.forEach(item => {
                    scores.push({
                        itemId: item._id,
                        dailyScores: {}
                    });
                });
            });

            checklist = new Audit5sChecklistModel({
                month,
                zoneId: zone._id,
                zoneNo: zone.zoneNo,
                zoneName: zone.zoneName,
                responsiblePerson: zone.responsiblePerson,
                docNo: zone.docNo,
                revNo: zone.revNo,
                revDate: zone.revDate,
                scores,
                auditorSignatures: {}
            });

            await checklist.save();
            checklist = await Audit5sChecklistModel.findById(checklist._id)
                .populate("responsiblePerson", "username first_name last_name email");
        } else {
            // Checklist exists, verify if template has changed and auto-sync
            const zone = await Audit5sZoneModel.findById(zoneId);
            if (zone && zone.isActive) {
                const activeItemIds = new Set();
                zone.categories.forEach(cat => {
                    cat.items.forEach(item => {
                        activeItemIds.add(item._id.toString());
                    });
                });

                let scoresUpdated = false;
                let updatedScores = checklist.scores.filter(s => {
                    const keep = activeItemIds.has(s.itemId.toString());
                    if (!keep) scoresUpdated = true;
                    return keep;
                });

                const existingItemIds = new Set(updatedScores.map(s => s.itemId.toString()));
                zone.categories.forEach(cat => {
                    cat.items.forEach(item => {
                        if (!existingItemIds.has(item._id.toString())) {
                            updatedScores.push({
                                itemId: item._id,
                                dailyScores: {}
                            });
                            scoresUpdated = true;
                        }
                    });
                });

                // Sync headers & responsible employee
                const zoneRevTime = zone.revDate ? new Date(zone.revDate).getTime() : 0;
                const chkRevTime = checklist.revDate ? new Date(checklist.revDate).getTime() : 0;
                if (checklist.docNo !== zone.docNo ||
                    checklist.revNo !== zone.revNo ||
                    zoneRevTime !== chkRevTime ||
                    checklist.responsiblePerson?._id?.toString() !== zone.responsiblePerson?.toString() ||
                    checklist.zoneName !== zone.zoneName ||
                    checklist.zoneNo !== zone.zoneNo) {

                    checklist.docNo = zone.docNo;
                    checklist.revNo = zone.revNo;
                    checklist.revDate = zone.revDate;
                    checklist.responsiblePerson = zone.responsiblePerson;
                    checklist.zoneName = zone.zoneName;
                    checklist.zoneNo = zone.zoneNo;
                    scoresUpdated = true;
                }

                if (scoresUpdated) {
                    checklist.scores = updatedScores;
                    await checklist.save();
                    checklist = await Audit5sChecklistModel.findById(checklist._id)
                        .populate("responsiblePerson", "username first_name last_name email");
                }
            }
        }

        res.status(200).json({ success: true, data: checklist });
    } catch (error) {
        console.error("Error in getChecklist:", error);
        res.status(500).json({ success: false, message: "Failed to fetch/generate checklist" });
    }
};

export const updateChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const { scores, auditorSignatures, docNo, revNo, revDate, responsiblePerson, zoneName, leaderPhoto, prevMonthData } = req.body;

        const updateData = {};
        if (scores) updateData.scores = scores;
        if (auditorSignatures) updateData.auditorSignatures = auditorSignatures;
        if (docNo) updateData.docNo = docNo;
        if (revNo) updateData.revNo = revNo;
        if (revDate) updateData.revDate = revDate;
        if (responsiblePerson) updateData.responsiblePerson = responsiblePerson;
        if (zoneName) updateData.zoneName = zoneName;
        if (leaderPhoto !== undefined) updateData.leaderPhoto = leaderPhoto;
        if (prevMonthData) updateData.prevMonthData = prevMonthData;

        const updated = await Audit5sChecklistModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        ).populate("responsiblePerson", "username first_name last_name email");

        if (!updated) {
            return res.status(404).json({ success: false, message: "Checklist not found" });
        }

        res.status(200).json({ success: true, data: updated, message: "Audit scores saved successfully" });
    } catch (error) {
        console.error("Error in updateChecklist:", error);
        res.status(500).json({ success: false, message: "Failed to update checklist" });
    }
};
