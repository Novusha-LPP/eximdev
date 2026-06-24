import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Register models
import UserModel from '../model/userModel.mjs';
import KPISheet from '../model/kpi/kpiSheetModel.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.PROD_MONGODB_URI;

async function inspect() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Find some sheets with status other than DRAFT
    const nonDraftSheets = await KPISheet.find({ status: { $ne: 'DRAFT' } })
      .limit(5)
      .populate('user', 'first_name last_name email')
      .populate('approval_history.by', 'first_name last_name username');

    console.log("Found non-draft sheets:", nonDraftSheets.length);
    for (const sheet of nonDraftSheets) {
      console.log(`\nSheet ID: ${sheet._id}`);
      console.log(`User: ${sheet.user?.first_name} ${sheet.user?.last_name}`);
      console.log(`Period: ${sheet.year}-${sheet.month}`);
      console.log(`Status: ${sheet.status}`);
      console.log("Approval History:", JSON.stringify(sheet.approval_history, null, 2));
      console.log("Signatures:", sheet.signatures);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error inspecting:", error);
  }
}

inspect();
