const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/market_intelligence');
  const adminDb = mongoose.connection.db.admin();

  console.log('=== market_intelligence Collections ===');
  const miCols = await mongoose.connection.db.listCollections().toArray();
  for (let c of miCols) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(`  ${c.name}: ${count}`);
  }

  console.log('\n=== exim Database Summary ===');
  const eximDb = mongoose.connection.useDb('exim');
  const eximCols = await eximDb.db.listCollections().toArray();
  for (let c of eximCols) {
    const nameLower = c.name.toLowerCase();
    if (nameLower.includes('contact') || nameLower.includes('account') || nameLower.includes('customer') || nameLower.includes('user') || nameLower.includes('lead') || nameLower.includes('company') || nameLower.includes('shipper') || nameLower.includes('exporter') || nameLower.includes('importer')) {
      const count = await eximDb.collection(c.name).countDocuments();
      console.log(`  ${c.name}: ${count}`);
    }
  }

  console.log('\n=== export Database Summary ===');
  const exportDb = mongoose.connection.useDb('export');
  const exportCols = await exportDb.db.listCollections().toArray();
  for (let c of exportCols) {
    const nameLower = c.name.toLowerCase();
    if (nameLower.includes('contact') || nameLower.includes('account') || nameLower.includes('customer') || nameLower.includes('user') || nameLower.includes('lead') || nameLower.includes('company') || nameLower.includes('shipper') || nameLower.includes('exporter') || nameLower.includes('importer')) {
      const count = await exportDb.collection(c.name).countDocuments();
      console.log(`  ${c.name}: ${count}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
