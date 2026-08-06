const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/exim');
  const eximDb = mongoose.connection.db;

  console.log('=== Sample exim.contacts Documents ===');
  const eximContacts = await eximDb.collection('contacts').find({}).limit(5).toArray();
  console.log(JSON.stringify(eximContacts, null, 2));

  console.log('=== Sample exim.accounts Documents ===');
  const eximAccounts = await eximDb.collection('accounts').find({}).limit(3).toArray();
  console.log(JSON.stringify(eximAccounts, null, 2));

  console.log('=== Sample export.users Documents ===');
  const exportDb = mongoose.connection.useDb('export').db;
  const exportUsers = await exportDb.collection('users').find({}).limit(3).toArray();
  console.log(JSON.stringify(exportUsers, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
