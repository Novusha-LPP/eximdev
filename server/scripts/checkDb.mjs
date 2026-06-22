/**
 * Check users, tenants and CRM data status
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });
dotenv.config({ path: '.env' });

const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.PROD_MONGODB_URI;
console.log('URI found:', !!uri);

(async () => {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const orgs = await db.collection('organizations').find({}).limit(5).toArray();
    console.log('Organizations count:', orgs.length);
    orgs.forEach(o => console.log('  _id:', o._id, 'name:', o.name));
    
    const users = await db.collection('users').find({}).limit(5).toArray();
    console.log('Sample users:');
    users.forEach(u => {
      const fields = Object.entries(u).filter(([k]) => k !== 'password').slice(0, 8).map(([k,v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : v}`).join(', ');
      console.log('  _id:', String(u._id), fields);
    });
    
    const userCount = await db.collection('users').countDocuments();
    console.log('Total users:', userCount);
    
    const usersWithTenant = await db.collection('users').find({ tenantId: { $exists: true, $ne: null } }).count();
    console.log('Users with tenantId:', usersWithTenant);
    
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', '));
    
    const crmCollections = ['crmaccounts', 'crmcontacts', 'crmleads', 'crmopportunities', 'crmtasks', 'crmsalesteams'];
    for (const col of crmCollections) {
      const has = collections.some(c => c.name === col);
      if (has) {
        const count = await db.collection(col).countDocuments();
        console.log(`  ${col}: ${count}`);
      } else {
        console.log(`  ${col}: NOT FOUND`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
