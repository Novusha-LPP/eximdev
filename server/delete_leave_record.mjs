import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import LeaveApplication from './model/attendance/LeaveApplication.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const mongoUri = process.env.PROD_MONGODB_URI || 'mongodb://exim:I9y5bcMUHkGHpgq2@ac-oqmvpdw-shard-00-00.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-01.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-02.xya3qh0.mongodb.net:27017/exim?ssl=true&replicaSet=atlas-103rb8-shard-0&authSource=admin&retryWrites=true&w=majority';
  console.log('Connecting to PRODUCTION database...');
  console.log('URI:', mongoUri.substring(0, 50) + '...');
  await mongoose.connect(mongoUri);
  
  const empId = mongoose.Types.ObjectId.isValid('69804de8317a48004a05479a') 
    ? new mongoose.Types.ObjectId('69804de8317a48004a05479a') 
    : '69804de8317a48004a05479a';
  
  // Delete the specific leave for April 30
  const leaveId = '69f03cdb1f4e8c386ac884f8';
  console.log(`\n🔴 PRODUCTION: Deleting LeaveApplication ${leaveId}...`);
  
  const result = await LeaveApplication.deleteOne({ _id: new mongoose.Types.ObjectId(leaveId) });
  
  console.log('Delete result:', result);
  if (result.deletedCount > 0) {
    console.log('✅ Successfully deleted the leave application for April 30 - May 6 from PRODUCTION');
  } else {
    console.log('❌ No record found to delete in PRODUCTION');
  }
  
  await mongoose.disconnect();
}

main().catch(console.error);
