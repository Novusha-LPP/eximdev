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

    // Find RABS user afzal
    const afzal = await UserModel.findOne({ username: 'afzal_ghanchi' });
    if (!afzal) {
      console.error('RABS user afzal not found');
      process.exit(1);
    }

    console.log('\n--- SIMULATING ATTACK/BYPASS PARAMETERS ---');
    console.log('RABS User Company ID:', afzal.company_id);
    
    // We pass an explicit query param pointing to a non-RABS company (e.g. SFPL)
    const nonRabsCompanyId = '69cd1e3b50e6c73acc73a918'; 
    const req = {
      user: afzal,
      query: { company_id: nonRabsCompanyId }
    };

    const res = mockRes((code, result) => {
      console.log('Response Status:', code);
      const docs = result.data || [];
      console.log(`Shifts returned: ${docs.length}`);
      
      let hasIncorrectCompany = false;
      docs.forEach(s => {
        console.log(` - Shift: ${s.shift_name}, Company: ${s.company_id}`);
        if (String(s.company_id) !== String(afzal.company_id)) {
          hasIncorrectCompany = true;
        }
      });

      if (hasIncorrectCompany) {
        console.error('❌ BUG: Returned shifts from a different company! Override succeeded.');
      } else {
        console.log('✅ SUCCESS: Override failed. Only RABS shifts are returned.');
      }
    });

    await getShifts(req, res);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
