import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
import Audit5sZoneModel from '../model/audit5s/Audit5sZone.mjs';
import Audit5sTemplateModel from '../model/audit5s/Audit5sTemplate.mjs';
import Audit5sChecklistModel from '../model/audit5s/Audit5sChecklist.mjs';
import UserModel from '../model/userModel.mjs';
import Company from '../model/attendance/Company.js';

const run = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI :
            process.env.NODE_ENV === 'server' ? process.env.SERVER_MONGODB_URI :
            process.env.DEV_MONGODB_URI || 'mongodb://127.0.0.1:27017/exim';
            
        await mongoose.connect(uri);
        console.log("Connected to DB");

        const templates = await Audit5sTemplateModel.find().lean();
        console.log("TEMPLATES COUNT:", templates.length);
        console.log("TEMPLATES:", JSON.stringify(templates, null, 2));

        const zones = await Audit5sZoneModel.find().populate("responsiblePerson").lean();
        console.log("ZONES COUNT:", zones.length);
        console.log("ZONES:", JSON.stringify(zones.map(z => ({
            _id: z._id,
            zoneNo: z.zoneNo,
            zoneName: z.zoneName,
            isActive: z.isActive,
            categoriesCount: z.categories?.length || 0,
            responsiblePerson: z.responsiblePerson?.username
        })), null, 2));

        const checklists = await Audit5sChecklistModel.find().lean();
        console.log("CHECKLISTS COUNT:", checklists.length);
        if (checklists.length > 0) {
            console.log("FIRST CHECKLIST:", JSON.stringify(checklists[0], null, 2));
            const respUserId = checklists[0].responsiblePerson;
            if (respUserId) {
                const userObj = await UserModel.findById(respUserId).lean();
                console.log("RESPONSIBLE USER FROM DB:", JSON.stringify(userObj, null, 2));
                if (userObj && userObj.company_id) {
                    const compObj = await mongoose.model('Company').findById(userObj.company_id).lean();
                    console.log("RESPONSIBLE USER COMPANY FROM DB:", JSON.stringify(compObj, null, 2));
                }
            }
        }

        const allUsers = await UserModel.find().populate("company_id").lean();
        console.log("ALL USERS COUNT:", allUsers.length);
        const rabsUsers = allUsers.filter(u => {
            const compName = u.company || (u.company_id && u.company_id.company_name) || "";
            return /RABS/i.test(compName);
        });
        console.log("RABS FILTER MATCHES COUNT:", rabsUsers.length);
        console.log("RABS USERS:", rabsUsers.map(u => ({
            username: u.username,
            role: u.role,
            company: u.company,
            companyNameFromId: u.company_id?.company_name
        })));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
