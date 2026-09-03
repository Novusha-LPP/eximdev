import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';
await mongoose.connect(uri);

const amcRenewals = await mongoose.connection.db.collection('amcrenewals').find({}).toArray();
console.log('AMC Renewals:', JSON.stringify(amcRenewals, null, 2));

const amcVisitors = await mongoose.connection.db.collection('amcvisitorlogs').find({}).toArray();
console.log('AMC Visitors:', JSON.stringify(amcVisitors, null, 2));

const equip = await mongoose.connection.db.collection('adminequipmentchecklists').find({}).toArray();
console.log('Admin Equipment Checklists:', JSON.stringify(equip, null, 2));

process.exit(0);
