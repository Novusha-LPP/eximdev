import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import UserModel from '../model/userModel.mjs';

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';
await mongoose.connect(uri);

const users = await UserModel.find({
  modules: {
    $in: ['Supplier Scorecard', 'AMC Suppliers Renewal', 'AMC Visitor Logs', 'Admin Equipment Checklist']
  }
}).select('username role modules');

console.log(`Users with AMC/Scorecard modules assigned (${users.length} users):`);
users.forEach(u => {
  const amcMods = (u.modules || []).filter(m => ['Supplier Scorecard', 'AMC Suppliers Renewal', 'AMC Visitor Logs', 'Admin Equipment Checklist'].includes(m));
  console.log(`- ${u.username} (${u.role}): ${amcMods.join(', ')}`);
});

const allUsers = await UserModel.find({}).select('username role modules');
console.log(`Total users in system: ${allUsers.length}`);

process.exit(0);
