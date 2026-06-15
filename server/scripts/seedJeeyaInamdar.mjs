import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';

dotenv.config({ path: './server/.env' });

const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function seed() {
  try {
    console.log('Connecting to DB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully!');

    // Find user jeeya_inamdar
    const user = await UserModel.findOne({ username: 'jeeya_inamdar' });
    if (!user) {
      console.error('User jeeya_inamdar not found. Seeding aborted.');
      process.exit(1);
    }

    console.log('Found user jeeya_inamdar. Updating fields...');

    // Assign screenshot specific details
    user.bank_name = 'State Bank of India';
    user.bank_account_no = '41403991055';
    user.ifsc_code = 'SBIN0007475';
    user.name_on_bank = 'Ms. Jeeya Trilok Inamdar';
    user.bank_account_status = 'Approved';
    
    user.attendance_settings = {
      ...user.attendance_settings,
      punch_methods: ['biometric']
    };
    user.biometric_serial_no = ['ZYSB01011069', 'JNP2244500561', 'JNP2244500538'];
    user.biometric_code = '241';
    
    user.salary_calculation_act = 'Shop Act';
    user.payroll_frequency = 'Monthly';
    user.overtime_eligible = false;
    user.enable_full_month_presence = false;
    user.retirement_age = 60;
    user.notice_period_days = 30;
    user.worker_type = 'Company Staff';
    user.employment_type = 'Confirm';
    user.employment_applicable_date = new Date('2025-12-01');
    user.skill_category = 'Skilled';
    
    user.monthly_salary = 20000;

    await user.save();
    console.log('User jeeya_inamdar successfully updated with screens data!');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
