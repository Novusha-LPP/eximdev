import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
import Audit5sZoneModel from '../model/audit5s/Audit5sZone.mjs';
import Audit5sTemplateModel from '../model/audit5s/Audit5sTemplate.mjs';
import UserModel from '../model/userModel.mjs';
import Company from '../model/attendance/Company.js';

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
            docName: "5'S' Audit Checklist",
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
            console.log("REACTIVATED EXISTING ZONE:", def.zoneNo);
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
            console.log("CREATED NEW ZONE:", def.zoneNo);
        }
    }
}

const run = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI :
            process.env.NODE_ENV === 'server' ? process.env.SERVER_MONGODB_URI :
            process.env.DEV_MONGODB_URI || 'mongodb://127.0.0.1:27017/exim';
            
        await mongoose.connect(uri);
        console.log("Connected to DB");

        // 1. Mark all zones inactive
        await Audit5sZoneModel.updateMany({}, { isActive: false });
        console.log("Marked all zones inactive.");

        // 2. Perform find ({ isActive: true }) - should be 0
        let zones = await Audit5sZoneModel.find({ isActive: true });
        console.log("Active zones before seeding:", zones.length);

        // 3. Seed/Reactivate
        await seedDefaultZones();

        // 4. Verify zone is now active
        zones = await Audit5sZoneModel.find({ isActive: true });
        console.log("Active zones after seeding:", zones.length);

        if (zones.length > 0 && zones[0].isActive === true) {
            console.log("✅ VERIFICATION PASSED: Seeding reactivated the zone without throwing error.");
        } else {
            console.log("❌ VERIFICATION FAILED.");
        }

        process.exit(0);
    } catch (e) {
        console.error("FAILED WITH ERROR:", e);
        process.exit(1);
    }
};

run();
