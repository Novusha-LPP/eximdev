import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';
await mongoose.connect(uri);

const Scorecard = mongoose.model('Scorecard', new mongoose.Schema({}, { strict: false, collection: 'scorecards' }));

const count = await Scorecard.countDocuments();
console.log('Total scorecards in DB:', count);

const docs = await Scorecard.find({}).limit(10);
console.log('Scorecards found:', JSON.stringify(docs, null, 2));

process.exit(0);
