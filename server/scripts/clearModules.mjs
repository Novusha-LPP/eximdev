/**
 * Clear user modules from all users
 *
 * Usage:
 *   node server/scripts/clearModules.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import User from '../model/userModel.mjs';

const clearModules = async () => {
  const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.PROD_MONGODB_URI;
  if (!uri) {
    console.error('No MongoDB URI found in environment variables');
    process.exit(1);
  }
  
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri, { maxPoolSize: 10 });
  console.log('Connected to MongoDB\n');
  
  // Check current modules
  const users = await User.find({}).select('username modules');
  console.log(`Total users: ${users.length}`);
  
  const usersWithModules = users.filter(u => u.modules && u.modules.length > 0);
  console.log(`Users with modules: ${usersWithModules.length}`);
  
  if (usersWithModules.length > 0) {
    // Update all users to clear modules
    const result = await User.updateMany({}, { $set: { modules: [] } });
    console.log('\nClearing modules...');
    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
  } else {
    console.log('\nNo modules found to clear. All users already have empty modules.');
  }
  
  // Verify
  const updatedUsers = await User.find({}).select('username modules');
  const stillHasModules = updatedUsers.filter(u => u.modules && u.modules.length > 0);
  console.log(`\nVerification: ${stillHasModules.length} users still have modules`);
  
  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
  process.exit(0);
};

clearModules().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
