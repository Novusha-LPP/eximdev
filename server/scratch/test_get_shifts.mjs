import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getShifts } from '../controllers/attendance/master.controller.js';
import UserModel from '../model/userModel.mjs';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

const mockRes = (callback) => {
  return {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      callback(this.statusCode, data);
      return this;
    }
  };
};

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    // Find users
    const afzal = await UserModel.findOne({ username: 'afzal_ghanchi' });
    const nonRabs = await UserModel.findOne({ company: { $ne: 'RABS Industries India Private Limited' }, isActive: true });
    
    console.log('\n--- ALL SHIFTS IN DB ---');
    const allShifts = await mongoose.model('Shift').find({}).populate('created_by', 'username company_id').lean();
    allShifts.forEach(s => {
      console.log(`- ID: ${s._id}, Name: ${s.shift_name}, Code: ${s.shift_code}, Company: ${s.company_id}, CreatedBy: ${s.created_by?.username} (Company: ${s.created_by?.company_id})`);
    });

    if (!afzal) {
      console.error('Afzal (RABS User) not found');
      process.exit(1);
    }
    console.log('RABS User:', afzal.username, 'Company ID:', afzal.company_id);
    if (nonRabs) {
      console.log('Non-RABS User:', nonRabs.username, 'Company:', nonRabs.company, 'Company ID:', nonRabs.company_id);
    }

    console.log('\n--- Fetching shifts for RABS User (Afzal) ---');
    const reqRabs = {
      user: afzal,
      query: { all_companies: 'true' } // try retrieving all
    };
    const resRabs = mockRes((code, result) => {
      console.log('Status Code:', code);
      const docs = result.data || [];
      console.log(`Shifts returned: ${docs.length}`);
      docs.forEach(s => {
        console.log(` - Shift: ${s.shift_name}, Created By: ${s.created_by?.username || s.created_by}`);
      });
    });
    await getShifts(reqRabs, resRabs);

    if (nonRabs) {
      console.log('\n--- Fetching shifts for Non-RABS User ---');
      const reqNonRabs = {
        user: nonRabs,
        query: { all_companies: 'true' }
      };
      const resNonRabs = mockRes((code, result) => {
        console.log('Status Code:', code);
        const docs = result.data || [];
        console.log(`Shifts returned: ${docs.length}`);
        docs.forEach(s => {
          console.log(` - Shift: ${s.shift_name}, Created By: ${s.created_by?.username || s.created_by}`);
        });
      });
      await getShifts(reqNonRabs, resNonRabs);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
