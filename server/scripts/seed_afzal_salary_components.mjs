import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Import models
import SalaryStructure from '../model/attendance/SalaryStructure.js';
import User from '../model/userModel.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function seedComponents() {
  console.log('[SEED] Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('[SEED] Connected.');

  const afzalId = new mongoose.Types.ObjectId("6a059ab3d065f33262fa04fe");
  const companyId = new mongoose.Types.ObjectId("69cd1e3b50e6c73acc73a926"); // RABS

  // Find and update/delete existing active structure for Afzal
  console.log('[SEED] Cleaning up existing salary structures for Afzal...');
  await SalaryStructure.deleteMany({ employee_id: afzalId });

  // Define components summing up to 27,000 Gross
  const components = [
    {
      payhead: 'Basic Salary',
      formula: '50% of Gross',
      monthly_amount: 13500,
      yearly_amount: 162000
    },
    {
      payhead: 'House Rent Allowance (HRA)',
      formula: '40% of Basic',
      monthly_amount: 5400,
      yearly_amount: 64800
    },
    {
      payhead: 'Conveyance Allowance',
      formula: 'Fixed Standard',
      monthly_amount: 1600,
      yearly_amount: 19200
    },
    {
      payhead: 'Special Allowance',
      formula: 'Balancing Component',
      monthly_amount: 6500,
      yearly_amount: 78000
    }
  ];

  console.log('[SEED] Creating new Salary Structure for Afzal Ghanchi...');
  const newStructure = await SalaryStructure.create({
    employee_id: afzalId,
    company_id: companyId,
    effective_from: new Date('2026-01-01'),
    salary_type: 'GROSS',
    gross_salary: 27000,
    components: components,
    status: 'ACTIVE',
    created_by: afzalId // set by user
  });

  console.log('[SEED] Created active salary structure with ID:', newStructure._id);
  console.log('[SEED] Breakdown created successfully:');
  newStructure.components.forEach(c => {
    console.log(`- ${c.payhead}: ₹${c.monthly_amount}/mo (₹${c.yearly_amount}/yr) | Formula: "${c.formula || '-'}"`);
  });

  await mongoose.disconnect();
}

seedComponents().catch(err => {
  console.error('[SEED] Failed to seed components:', err);
  process.exit(1);
});
