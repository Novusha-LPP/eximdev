import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const uri = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const leads = await db.collection('crm_leads').find({
    $or: [{ firstName: /Nikhil/i }, { lastName: /Shah/i }, { company: /Parmeswar/i }]
  }).toArray();
  console.log('CRM_LEADS found:', leads.length);
  leads.forEach(l => {
    console.log('Lead:', { _id: l._id, firstName: l.firstName, lastName: l.lastName, company: l.company, status: l.status, convertedToOpportunity: l.convertedToOpportunity, ownerId: l.ownerId, createdAt: l.createdAt });
  });

  const opps = await db.collection('crm_opportunities').find({
    $or: [{ name: /Nikhil/i }, { name: /Shah/i }, { name: /Parmeswar/i }]
  }).toArray();
  console.log('CRM_OPPORTUNITIES found:', opps.length);
  opps.forEach(o => {
    console.log('Opp:', { _id: o._id, name: o.name, stage: o.stage, ownerId: o.ownerId, period: o.period, createdAt: o.createdAt });
  });

  await mongoose.disconnect();
}

run().catch(console.error);
