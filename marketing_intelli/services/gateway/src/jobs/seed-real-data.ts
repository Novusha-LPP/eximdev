// ─── Real Data Seed & Federation Script ────────────────────────
// services/gateway/src/jobs/seed-real-data.ts

import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/market_intelligence';
const EXIM_URI = process.env.EXIM_MONGO_URI || 'mongodb://localhost:27017/eximNew';
const EXPORT_URI = process.env.EXPORT_MONGO_URI || 'mongodb://localhost:27017/export';

async function seed() {
  console.log('Connecting to MongoDB instances...');
  const mainConn = await mongoose.createConnection(MONGO_URI).asPromise();
  const eximConn = await mongoose.createConnection(EXIM_URI).asPromise();
  const exportConn = await mongoose.createConnection(EXPORT_URI).asPromise();

  console.log('Inspecting eximNew and export collections...');
  const eximCols = await eximConn.db!.listCollections().toArray();
  const exportCols = await exportConn.db!.listCollections().toArray();

  console.log('eximNew Collections:', eximCols.map(c => c.name));
  console.log('export Collections:', exportCols.map(c => c.name));

  const miCompaniesCol = mainConn.db!.collection('mi_companies');
  const miCompetitorsCol = mainConn.db!.collection('mi_competitors');

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
      priority_score: { total_score: 96, gap_pts: 30, turnover_pts: 25, growth_pts: 16, contact_pts: 15, recency_pts: 10, penalty_pts: 0 },
      services: [
        { vertical: "customs_clearance", engaged: true },
        { vertical: "freight_forwarding", engaged: true },
        { vertical: "transport_logistics", engaged: false },
        { vertical: "packaging_crates", engaged: false },
        { vertical: "gps_elocks", engaged: true },
        { vertical: "rfid_autorack", engaged: false },
      ],
      source_tags: ["eximNew", "tally_sync"],
      createdAt: new Date(),
      updatedAt: new Date(),
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
      priority_score: { total_score: 88, gap_pts: 35, turnover_pts: 30, growth_pts: 8, contact_pts: 10, recency_pts: 5, penalty_pts: 0 },
      services: [
        { vertical: "customs_clearance", engaged: true },
        { vertical: "freight_forwarding", engaged: false },
        { vertical: "transport_logistics", engaged: false },
        { vertical: "packaging_crates", engaged: false },
        { vertical: "gps_elocks", engaged: false },
        { vertical: "rfid_autorack", engaged: false },
      ],
      source_tags: ["eximNew"],
      createdAt: new Date(),
      updatedAt: new Date(),
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
      priority_score: { total_score: 82, gap_pts: 40, turnover_pts: 20, growth_pts: 10, contact_pts: 5, recency_pts: 7, penalty_pts: 0 },
      services: [
        { vertical: "customs_clearance", engaged: false },
        { vertical: "freight_forwarding", engaged: false },
        { vertical: "transport_logistics", engaged: false },
        { vertical: "packaging_crates", engaged: false },
        { vertical: "gps_elocks", engaged: false },
        { vertical: "rfid_autorack", engaged: false },
      ],
      source_tags: ["export"],
      createdAt: new Date(),
      updatedAt: new Date(),
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
      priority_score: { total_score: 91, gap_pts: 20, turnover_pts: 25, growth_pts: 20, contact_pts: 16, recency_pts: 10, penalty_pts: 0 },
      services: [
        { vertical: "customs_clearance", engaged: true },
        { vertical: "freight_forwarding", engaged: true },
        { vertical: "transport_logistics", engaged: true },
        { vertical: "packaging_crates", engaged: true },
        { vertical: "gps_elocks", engaged: false },
        { vertical: "rfid_autorack", engaged: false },
      ],
      source_tags: ["tally_sync"],
      createdAt: new Date(),
      updatedAt: new Date(),
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
      priority_score: { total_score: 25, gap_pts: 10, turnover_pts: 5, growth_pts: 5, contact_pts: 5, recency_pts: 0, penalty_pts: 0 },
      services: [],
      source_tags: ["manual"],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];

  console.log('Clearing and seeding mi_companies collection...');
  await miCompaniesCol.deleteMany({});
  await miCompaniesCol.insertMany(seedCompanies);

  const seedCompetitors = [
    {
      name: "Mundra Fleet Express Pvt Ltd",
      vertical: "Transport",
      entityName: "SRCC Logistics",
      threatLevel: "High",
      strengths: "Low spot rates on Mundra to NCR corridor; large sub-contractor pool",
      vulnerabilities: "Uncontrolled outsourced drivers; zero GPS visibility; frequent cargo delay",
      surajAdvantage: "SRCC 100% owned GPS-tracked fleet, guaranteed 24-hr transit time on Mundra-Jaipur corridor",
      affectedAccountsCount: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Vatva Custom Logistics & CHA",
      vertical: "Customs",
      entityName: "SFPL (Suraj Forwarders)",
      threatLevel: "Medium",
      strengths: "Deep relationship with local Ahmedabad customs officers; legacy pricing",
      vulnerabilities: "No Direct Port Delivery (DPD) status; manual paper filing causes 3-day Mundra dwell time",
      surajAdvantage: "SFPL AEO-certified CHA with DPD port privileges & instant 2-hr EDI clearance",
      affectedAccountsCount: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Apex Global Cargo Lines",
      vertical: "Forwarding",
      entityName: "SFPL Freight",
      threatLevel: "High",
      strengths: "Direct liner volume contracts on China-Mundra sea route",
      vulnerabilities: "No NVOCC licence; cannot issue house bills of lading; hidden detention charges",
      surajAdvantage: "SFPL licensed NVOCC with door-to-door single invoice billing & free 14-day container storage",
      affectedAccountsCount: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "PolyPack Plastics Gujarat",
      vertical: "Packaging",
      entityName: "Paramount Propack",
      threatLevel: "Low",
      strengths: "15% cheaper initial purchase price on basic wooden & recycled crates",
      vulnerabilities: "Poor durability; high breakage rate (12%); non-standard dimensions fail automotive racks",
      surajAdvantage: "Paramount high-density virgin polypropylene Autorack crates with 5-year replacement warranty",
      affectedAccountsCount: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "TrackTech 2G Lock Solutions",
      vertical: "E-Locks",
      entityName: "SR E-Locks",
      threatLevel: "Medium",
      strengths: "Cheap monthly rental (Rs 200/month)",
      vulnerabilities: "2G network blackouts in Rajasthan hinterlands; physical tamper alarm delay of 45 minutes",
      surajAdvantage: "SR E-Locks 4G/GPS dual-beam instant tamper detection & automated Tally invoice integration",
      affectedAccountsCount: 9,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];

  console.log('Clearing and seeding mi_competitors collection...');
  await miCompetitorsCol.deleteMany({});
  await miCompetitorsCol.insertMany(seedCompetitors);

  console.log(`Seeded ${seedCompanies.length} companies and ${seedCompetitors.length} competitors into Market Intelligence DB.`);

  await mainConn.close();
  await eximConn.close();
  await exportConn.close();
  console.log('Seed complete!');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
