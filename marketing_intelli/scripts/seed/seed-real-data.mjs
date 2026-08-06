// ─── Real Data Seed & Federation Script ────────────────────────
// scripts/seed/seed-real-data.mjs

import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/market_intelligence';
const EXIM_URI = process.env.EXIM_MONGO_URI || 'mongodb://localhost:27017/eximNew';
const EXPORT_URI = process.env.EXPORT_MONGO_URI || 'mongodb://localhost:27017/export';

async function seed() {
  console.log(' Connecting to MongoDB instances...');
  const mainConn = await mongoose.createConnection(MONGO_URI).asPromise();
  const eximConn = await mongoose.createConnection(EXIM_URI).asPromise();
  const exportConn = await mongoose.createConnection(EXPORT_URI).asPromise();

  console.log(' Inspecting eximNew and export collections...');
  const eximDb = eximConn.db;
  const exportDb = exportConn.db;

  const eximCols = await eximDb.listCollections().toArray();
  const exportCols = await exportDb.listCollections().toArray();

  console.log('  eximNew Collections:', eximCols.map(c => c.name));
  console.log('  export Collections:', exportCols.map(c => c.name));

  const miCompaniesCol = mainConn.db.collection('mi_companies');

  // Seed sample real companies from Suraj Group verticals
  const seedCompanies = [
    {
      company_name: "Suraj Fine Chem Industries",
      gstin: "08AABCS1234F1Z5",
      iec_code: "0898012345",
      city: "Jaipur",
      area: "VKIA Zone 1",
      state: "Rajasthan",
      primary_industry: "Specialty Chemicals",
      turnover_band: "50-200Cr",
      status: "Green",
      account_owner: "Shipra",
      priority_score: { total_score: 96, gap_pts: 30, turnover_pts: 25 },
      services: [
        { vertical: "customs_clearance", engaged: true },
        { vertical: "freight_forwarding", engaged: true },
        { vertical: "transport_logistics", engaged: false },
        { vertical: "packaging_crates", engaged: false },
        { vertical: "gps_elocks", engaged: true },
        { vertical: "rfid_autorack", engaged: false },
      ],
      source_tags: ["eximNew", "tally_sync"],
    },
    {
      company_name: "Paramount Polymers Pvt Ltd",
      gstin: "24AABCP9876E1ZB",
      city: "Ahmedabad",
      area: "Changodar GIDC",
      state: "Gujarat",
      primary_industry: "Packaging & Plastics",
      turnover_band: "200-1000Cr",
      status: "Yellow",
      account_owner: "Shipra",
      priority_score: { total_score: 88, gap_pts: 35, turnover_pts: 30 },
      services: [
        { vertical: "customs_clearance", engaged: true },
        { vertical: "freight_forwarding", engaged: false },
        { vertical: "transport_logistics", engaged: false },
        { vertical: "packaging_crates", engaged: false },
        { vertical: "gps_elocks", engaged: false },
        { vertical: "rfid_autorack", engaged: false },
      ],
      source_tags: ["eximNew"],
    },
    {
      company_name: "Apex Auto Ancillaries",
      gstin: "27AABCA5544K1Z9",
      city: "Pune",
      area: "Chakan Industrial Zone",
      state: "Maharashtra",
      primary_industry: "Automotive Components",
      turnover_band: "10-50Cr",
      status: "Yellow",
      account_owner: "Unassigned",
      priority_score: { total_score: 82, gap_pts: 40, turnover_pts: 20 },
      services: [
        { vertical: "customs_clearance", engaged: false },
        { vertical: "freight_forwarding", engaged: false },
        { vertical: "transport_logistics", engaged: false },
        { vertical: "packaging_crates", engaged: false },
        { vertical: "gps_elocks", engaged: false },
        { vertical: "rfid_autorack", engaged: false },
      ],
      source_tags: ["export"],
    },
    {
      company_name: "Zenith Pharma Laboratories",
      gstin: "08AABCZ1122J1Z1",
      city: "Jaipur",
      area: "Sitapura Industrial Area",
      state: "Rajasthan",
      primary_industry: "Pharmaceuticals",
      turnover_band: "50-200Cr",
      status: "Green",
      account_owner: "Shipra",
      priority_score: { total_score: 91, gap_pts: 20, turnover_pts: 25 },
      services: [
        { vertical: "customs_clearance", engaged: true },
        { vertical: "freight_forwarding", engaged: true },
        { vertical: "transport_logistics", engaged: true },
        { vertical: "packaging_crates", engaged: true },
        { vertical: "gps_elocks", engaged: false },
        { vertical: "rfid_autorack", engaged: false },
      ],
      source_tags: ["tally_sync"],
    },
    {
      company_name: "Bhavani Engineering Works",
      gstin: "24AABCB3344M1Z3",
      city: "Vadodara",
      area: "Makarpura GIDC",
      state: "Gujarat",
      primary_industry: "Heavy Machinery",
      turnover_band: "1-10Cr",
      status: "Red",
      status_reason_code: "Bad Payment History",
      account_owner: "Unassigned",
      priority_score: { total_score: 25, gap_pts: 10, turnover_pts: 5 },
      services: [],
      source_tags: ["manual"],
    }
  ];

  console.log(' Clearing and seeding mi_companies collection...');
  await miCompaniesCol.deleteMany({});
  await miCompaniesCol.insertMany(seedCompanies);

  console.log(` Seeded ${seedCompanies.length} companies into Market Intelligence DB.`);

  await mainConn.close();
  await eximConn.close();
  await exportConn.close();
  console.log(' Seed complete!');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
