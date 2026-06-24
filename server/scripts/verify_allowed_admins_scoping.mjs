import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/userModel.mjs';
import TeamModel from '../model/teamModel.mjs';
import { isRestrictedAllowedAdmin, getRestrictedEmployeeIds } from '../utils/attendance/allowedAdminRestriction.mjs';

dotenv.config({ path: './server/.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    // Find target users
    const ajith = await User.findOne({ username: 'ajith_sivadasan' });
    const afzal = await User.findOne({ username: 'afzal_ghanchi' });
    const shalini = await User.findOne({ username: 'shalini_arun' });

    if (!ajith) {
      console.log('User ajith_sivadasan not found');
    } else {
      console.log('Found Ajith Sivadasan:', { _id: ajith._id, isAttendanceAllowedAdmin: ajith.isAttendanceAllowedAdmin });
      if (!ajith.isAttendanceAllowedAdmin) {
        ajith.isAttendanceAllowedAdmin = true;
        await ajith.save();
        console.log('Enabled isAttendanceAllowedAdmin for Ajith');
      }
    }

    if (!afzal) {
      console.log('User afzal_ghanchi not found');
    } else {
      console.log('Found Afzal Ghanchi:', { _id: afzal._id, isAttendanceAllowedAdmin: afzal.isAttendanceAllowedAdmin });
      if (!afzal.isAttendanceAllowedAdmin) {
        afzal.isAttendanceAllowedAdmin = true;
        await afzal.save();
        console.log('Enabled isAttendanceAllowedAdmin for Afzal');
      }
    }

    // Test restrictions on Ajith
    if (ajith) {
      const isRestrictedAjith = isRestrictedAllowedAdmin(ajith);
      console.log('isRestrictedAllowedAdmin(ajith):', isRestrictedAjith);
      if (isRestrictedAjith) {
        const restrictedIds = await getRestrictedEmployeeIds(ajith);
        console.log(`getRestrictedEmployeeIds(ajith) resolved ${restrictedIds ? restrictedIds.length : 0} employee IDs:`, restrictedIds);
      }
    }

    // Test restrictions on Afzal
    if (afzal) {
      const isRestrictedAfzal = isRestrictedAllowedAdmin(afzal);
      console.log('isRestrictedAllowedAdmin(afzal):', isRestrictedAfzal);
      if (isRestrictedAfzal) {
        const restrictedIds = await getRestrictedEmployeeIds(afzal);
        console.log(`getRestrictedEmployeeIds(afzal) resolved ${restrictedIds ? restrictedIds.length : 0} employee IDs:`, restrictedIds);
      }
    }

    // Test restrictions on Shalini (global admin)
    if (shalini) {
      const isRestrictedShalini = isRestrictedAllowedAdmin(shalini);
      console.log('isRestrictedAllowedAdmin(shalini):', isRestrictedShalini);
      const restrictedIds = await getRestrictedEmployeeIds(shalini);
      console.log('getRestrictedEmployeeIds(shalini) (should be null):', restrictedIds);
    }

    console.log('Verification script completed successfully.');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await mongoose.connection.close();
    console.log('DB connection closed.');
  }
}

run();
