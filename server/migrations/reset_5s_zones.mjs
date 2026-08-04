import mongoose from "mongoose";
import dotenv from "dotenv";
import Audit5sZoneModel from "../model/audit5s/Audit5sZone.mjs";
import Audit5sChecklistModel from "../model/audit5s/Audit5sChecklist.mjs";
import Audit5sTemplateModel from "../model/audit5s/Audit5sTemplate.mjs";
import UserModel from "../model/userModel.mjs";

dotenv.config();

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

async function run() {
    try {
        const MONGODB_URI =
            process.env.MONGO_URI ||
            process.env.PROD_MONGODB_URI ||
            process.env.SERVER_MONGODB_URI ||
            process.env.DEV_MONGODB_URI;

        if (!MONGODB_URI) {
            console.error("No MongoDB URI found.");
            process.exit(1);
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully.");

        console.log("Cleaning up old Audit 5S data...");
        await Audit5sZoneModel.deleteMany({});
        await Audit5sChecklistModel.deleteMany({});
        await Audit5sTemplateModel.deleteMany({});

        console.log("Creating default global template...");
        const template = new Audit5sTemplateModel({
            docNo: "RI/QAD/R/04",
            revNo: "00",
            revDate: new Date("2024-12-10"),
            categories: DEFAULT_CATEGORIES
        });
        await template.save();

        console.log("Seeding default zones...");
        const defaultUser = await UserModel.findOne({ isActive: { $ne: false } });
        if (!defaultUser) {
            console.error("No active users found in DB. Cannot seed zones.");
            process.exit(1);
        }

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
            console.log(`Zone ${def.zoneNo}: ${def.zoneName} -> Assigned to: ${user ? user.username : 'Default (' + defaultUser.username + ')'}`);

            const newZone = new Audit5sZoneModel({
                zoneNo: def.zoneNo,
                zoneName: def.zoneName,
                responsiblePerson: assignedUser,
                categories: DEFAULT_CATEGORIES,
                docNo: "RI/QAD/R/04",
                revNo: "00",
                revDate: new Date("2024-12-10")
            });
            await newZone.save();
        }

        console.log("Database reset and seed complete!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

run();
