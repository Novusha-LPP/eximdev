const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/market_intelligence';

async function clean() {
  console.log('Connecting to DB...');
  const conn = await mongoose.createConnection(MONGO_URI).asPromise();
  const companies = conn.db.collection('mi_companies');

  const dummyGstinRegex = /^24[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9]$/; // generic
  // specifically federate-all-exim-data.ts used:
  // 24AAAAV...F1Z5
  // 24BBBBV...F2Z8
  // 24CCCCV...F3Z9
  // 24DDDDV...F4Z0

  console.log('Cleaning companies (round 2)...');
  const allCompanies = await companies.find({}).toArray();
  let compUpdated = 0;
  for (const comp of allCompanies) {
    const unsetObj = {};
    let needsUpdate = false;

    if (comp.gstin && (
      comp.gstin.startsWith('24AAAAV') || 
      comp.gstin.startsWith('24BBBBV') || 
      comp.gstin.startsWith('24CCCCV') || 
      comp.gstin.startsWith('24DDDDV')
    )) {
      unsetObj.gstin = "";
      needsUpdate = true;
    }
    
    if (comp.iec_code && (
      comp.iec_code.startsWith('0305') || 
      comp.iec_code.startsWith('0308') || 
      comp.iec_code.startsWith('0309') || 
      comp.iec_code.startsWith('0310')
    )) {
      unsetObj.iec_code = "";
      needsUpdate = true;
    }

    if (comp.cin_pan && comp.cin_pan === 'AAACV1234F') {
      unsetObj.cin_pan = "";
      needsUpdate = true;
    }

    if (["Sitapura Industrial Area", "Changodar GIDC", "GIDC Industrial Zone", "Industrial Belt"].includes(comp.area)) {
      unsetObj.area = "";
      needsUpdate = true;
    }
    
    if (["Metals & Manufacturing", "Automotive Ancillaries", "Logistics & Trade", "Manufacturing & Trade"].includes(comp.primary_industry)) {
      unsetObj.primary_industry = "";
      needsUpdate = true;
    }

    if (["10-50Cr", "50-200Cr"].includes(comp.turnover_band)) {
      unsetObj.turnover_band = "";
      needsUpdate = true;
    }

    if (comp.priority_score && (comp.priority_score.total_score === 78 || comp.priority_score.total_score === 80 || comp.priority_score.total_score === 92)) {
      // federate-all-exim-data calculates scores but it might be consistent. Actually wait, they used a calculator.
      // let's just clear priority score for anything that came from sync with dummy flags
      if (comp.source_tags && (comp.source_tags.includes("customers_sync") || comp.source_tags.includes("leads_sync") || comp.source_tags.includes("organisations_sync") || comp.source_tags.includes("companies_sync"))) {
        unsetObj.priority_score = "";
        needsUpdate = true;
      }
    }

    // specific dummy arrays for products_manufactured etc
    if (comp.products_manufactured && comp.products_manufactured.length > 0) {
      if (comp.products_manufactured.includes("Precision Components") || comp.products_manufactured.includes("Press Components") || comp.products_manufactured.includes("Industrial Goods")) {
        unsetObj.products_manufactured = "";
        needsUpdate = true;
      }
    }

    if (comp.raw_material_imports === true) {
      unsetObj.raw_material_imports = "";
      needsUpdate = true;
    }
    
    if (comp.export_activity !== undefined) {
      unsetObj.export_activity = "";
      needsUpdate = true;
    }

    if (comp.gst_filing_status === "Regular") {
      unsetObj.gst_filing_status = "";
      needsUpdate = true;
    }

    if (comp.data_confidence_tag) {
      unsetObj.data_confidence_tag = "";
      needsUpdate = true;
    }
    
    if (comp.revenue_growth_trend) {
      unsetObj.revenue_growth_trend = "";
      needsUpdate = true;
    }

    if (comp.seasonal_demand_pattern) {
      unsetObj.seasonal_demand_pattern = "";
      needsUpdate = true;
    }

    if (comp.best_approach_window) {
      unsetObj.best_approach_window = "";
      needsUpdate = true;
    }

    if (needsUpdate) {
      await companies.updateOne({ _id: comp._id }, { $unset: unsetObj });
      compUpdated++;
    }
  }

  console.log(`Updated ${compUpdated} companies.`);
  await conn.close();
}

clean().catch(console.error);
