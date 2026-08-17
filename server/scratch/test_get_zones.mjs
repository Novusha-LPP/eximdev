import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
import Audit5sZoneModel from '../model/audit5s/Audit5sZone.mjs';
import Audit5sTemplateModel from '../model/audit5s/Audit5sTemplate.mjs';
import UserModel from '../model/userModel.mjs';

const DEFAULT_CATEGORIES = [
    {
        name: "1S Sort 1S (Seiri)",
        subName: "Organization",
        items: [
            { text: "Are all unnecessary tools, equipment, and materials removed?" }
        ]
    }
];

const DEFAULT_ZONES = [
    { zoneNo: "01", zoneName: "SECURITY AREA", leader: "ramdev" }
];

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

const run = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI :
            process.env.NODE_ENV === 'server' ? process.env.SERVER_MONGODB_URI :
            process.env.DEV_MONGODB_URI || 'mongodb://127.0.0.1:27017/exim';
            
        await mongoose.connect(uri);
        console.log("Connected to DB");

        // Simulate getZones
        let zones = await Audit5sZoneModel.find({ isActive: true })
            .populate("responsiblePerson", "username first_name last_name email")
            .sort({ zoneNo: 1 });

        console.log("Active zones found:", zones.length);

        if (zones.length === 0) {
            console.log("No active zones. Seeding...");
            await seedDefaultZones();
            console.log("Seeding done!");
            zones = await Audit5sZoneModel.find({ isActive: true })
                .populate("responsiblePerson", "username first_name last_name email")
                .sort({ zoneNo: 1 });
            console.log("Active zones count after seeding:", zones.length);
        }

        process.exit(0);
    } catch (e) {
        console.error("FAILED WITH ERROR:", e);
        process.exit(1);
    }
};

run();
