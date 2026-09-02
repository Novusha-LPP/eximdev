/**
 * PHASE 1 & 2 — Data Inspection & Profiling Script
 * Fetches live data from the transport API and prints full schema analysis.
 */
import https from 'https';
import http from 'http';

const TRANSPORT_BASE = 'https://eximbot.alvision.in/transport';
const API_KEY = '1234567890';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'x-api-key': API_KEY } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse JSON: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
  });
}

function inspectColumn(values, colName) {
  const total = values.length;
  let nullCount = 0;
  let blankCount = 0;
  const typeCounts = {};
  const sampleValues = [];
  const uniqueVals = new Set();
  
  for (const val of values) {
    if (val === null || val === undefined) { nullCount++; continue; }
    if (val === '') { blankCount++; continue; }
    
    const t = Array.isArray(val) ? 'array' : typeof val;
    typeCounts[t] = (typeCounts[t] || 0) + 1;
    
    const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
    uniqueVals.add(strVal);
    if (sampleValues.length < 5) sampleValues.push(strVal.length > 80 ? strVal.slice(0, 80) + '...' : strVal);
  }
  
  const nullRate = ((nullCount + blankCount) / total * 100).toFixed(1);
  const inferredType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
  
  return {
    column: colName,
    inferredType,
    totalValues: total,
    nulls: nullCount,
    blanks: blankCount,
    nullRate: `${nullRate}%`,
    uniqueCount: uniqueVals.size,
    samples: sampleValues,
    flagged: parseFloat(nullRate) > 10
  };
}

function findAllKeys(arr) {
  const keys = new Set();
  for (const item of arr) {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(k => keys.add(k));
    }
  }
  return Array.from(keys);
}

function profileDataset(arr, label) {
  if (!arr || arr.length === 0) {
    console.log(`\n  [${label}] — EMPTY (0 records)\n`);
    return;
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  ${label} — ${arr.length} records`);
  console.log(`${'='.repeat(80)}`);
  
  const keys = findAllKeys(arr);
  console.log(`  Columns (${keys.length}): ${keys.join(', ')}`);
  console.log('');
  
  const results = [];
  for (const key of keys) {
    const values = arr.map(item => item?.[key]);
    const result = inspectColumn(values, key);
    results.push(result);
    
    const flag = result.flagged ? ' ⚠️ HIGH NULL RATE' : '';
    console.log(`  📌 ${result.column}`);
    console.log(`     Type: ${result.inferredType} | Unique: ${result.uniqueCount} | Nulls: ${result.nulls} | Blanks: ${result.blanks} | Null Rate: ${result.nullRate}${flag}`);
    console.log(`     Samples: ${result.samples.join(' | ')}`);
    console.log('');
  }
  
  // Identify date columns
  const dateColumns = keys.filter(k => {
    const vals = arr.map(item => item?.[k]).filter(v => v);
    const sample = String(vals[0] || '');
    return sample.match(/^\d{4}-\d{2}-\d{2}/) || sample.match(/^\d{2}-\d{2}-\d{4}/);
  });
  
  if (dateColumns.length > 0) {
    console.log('  📅 Date columns detected:', dateColumns.join(', '));
    for (const dc of dateColumns) {
      const vals = arr.map(item => item?.[dc]).filter(v => v).map(v => String(v).slice(0, 10)).sort();
      if (vals.length > 0) {
        console.log(`     ${dc}: earliest = ${vals[0]}, latest = ${vals[vals.length - 1]}`);
      }
    }
    console.log('');
  }
  
  // Identify potential status, ID, distance, duration columns
  const statusCols = keys.filter(k => /status|state|condition/i.test(k));
  const idCols = keys.filter(k => /id|_id|no$|number/i.test(k));
  const durationCols = keys.filter(k => /duration|time|hours|minutes/i.test(k));
  const distanceCols = keys.filter(k => /distance|km|miles|mileage/i.test(k));
  const utilizationCols = keys.filter(k => /util|usage|percent|pct|rate/i.test(k));
  
  console.log('  🔍 Column Classification:');
  if (idCols.length) console.log(`     IDs: ${idCols.join(', ')}`);
  if (statusCols.length) console.log(`     Statuses: ${statusCols.join(', ')}`);
  if (durationCols.length) console.log(`     Durations: ${durationCols.join(', ')}`);
  if (distanceCols.length) console.log(`     Distances: ${distanceCols.join(', ')}`);
  if (utilizationCols.length) console.log(`     Utilization: ${utilizationCols.join(', ')}`);
  console.log('');
  
  // Check for duplicates
  if (idCols.length > 0) {
    for (const idCol of idCols.slice(0, 3)) {
      const vals = arr.map(item => item?.[idCol]).filter(v => v);
      const uniqueIds = new Set(vals.map(v => String(v)));
      if (vals.length !== uniqueIds.size) {
        console.log(`  ⚠️ Duplicate values in ${idCol}: ${vals.length} total, ${uniqueIds.size} unique (${vals.length - uniqueIds.size} duplicates)`);
      }
    }
  }
  
  // Check for illogical values
  for (const key of keys) {
    const vals = arr.map(item => item?.[key]).filter(v => v !== null && v !== undefined);
    if (vals.length > 0 && typeof vals[0] === 'number') {
      const negative = vals.filter(v => v < 0);
      if (negative.length > 0) {
        console.log(`  ⚠️ Negative values in ${key}: ${negative.length} found (samples: ${negative.slice(0, 3).join(', ')})`);
      }
      if (/percent|pct|rate|util/i.test(key)) {
        const over100 = vals.filter(v => v > 100);
        if (over100.length > 0) {
          console.log(`  ⚠️ Values > 100% in ${key}: ${over100.length} found`);
        }
      }
    }
  }
  
  return results;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   PHASE 1 & 2 — Fleet Data Inspection & Profiling          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  // Fetch current month data (June 2026)
  const startDate = '2026-06-01';
  const endDate = '2026-06-29';
  
  console.log(`📡 Fetching dispatch-range data: ${startDate} to ${endDate}`);
  const dispatchUrl = `${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range?startDate=${startDate}&endDate=${endDate}`;
  
  let dispatchData;
  try {
    dispatchData = await fetchJSON(dispatchUrl);
    console.log(`✅ API Response received. success=${dispatchData.success}`);
    console.log(`   Top-level keys: ${Object.keys(dispatchData).join(', ')}`);
    console.log('');
  } catch (err) {
    console.error('❌ Failed to fetch dispatch data:', err.message);
    return;
  }
  
  // Print top-level scalars
  for (const [key, val] of Object.entries(dispatchData)) {
    if (!Array.isArray(val) && typeof val !== 'object') {
      console.log(`   ${key}: ${val}`);
    } else if (Array.isArray(val)) {
      console.log(`   ${key}: Array[${val.length}]`);
    }
  }
  console.log('');
  
  // Profile each dataset
  const { fleetStatus, activeLRs, closedLRs, exceptions } = dispatchData;
  
  profileDataset(fleetStatus, 'FLEET STATUS (Vehicle Inventory)');
  profileDataset(closedLRs, 'CLOSED LRs (Completed Trips)');
  profileDataset(activeLRs, 'ACTIVE LRs (In-Progress Trips)');
  profileDataset(exceptions, 'EXCEPTIONS');
  
  // Fleet Summary API
  console.log('\n\n📡 Fetching fleet-summary data (FY 2026)...');
  const summaryUrl = `${TRANSPORT_BASE}/api/vehicle-dsr/fleet-summary?fyStartYear=2026`;
  
  try {
    const summaryData = await fetchJSON(summaryUrl);
    console.log(`✅ Fleet Summary API Response received. success=${summaryData.success}`);
    if (summaryData.data) {
      console.log(`   Top-level keys: ${Object.keys(summaryData.data).join(', ')}`);
      if (summaryData.data.rows) {
        profileDataset(summaryData.data.rows, 'FLEET SUMMARY ROWS (Vehicle-level FY breakdown)');
      }
      if (summaryData.data.summary) {
        console.log('\n  Fleet Summary -> summary:');
        console.log(JSON.stringify(summaryData.data.summary, null, 2).split('\n').map(l => '    ' + l).join('\n'));
      }
    }
  } catch (err) {
    console.error('❌ Failed to fetch fleet summary:', err.message);
  }
  
  // Fleet utilization-report API
  console.log('\n\n📡 Fetching utilization-report data...');
  const utilUrl = `${TRANSPORT_BASE}/api/fleet/utilization-report?startDate=${startDate}&endDate=${endDate}`;
  
  try {
    const utilData = await fetchJSON(utilUrl);
    console.log(`✅ Utilization Report API Response received. success=${utilData.success}`);
    console.log(`   Full response structure:`);
    console.log(JSON.stringify(utilData, null, 2).split('\n').slice(0, 30).map(l => '    ' + l).join('\n'));
  } catch (err) {
    console.error('❌ Failed to fetch utilization report:', err.message);
  }
  
  // Summary
  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   PHASE 2 — Fleet Summary                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  const uniqueVehicles = new Set();
  if (fleetStatus) fleetStatus.forEach(v => { if (v.vehicleNumber) uniqueVehicles.add(v.vehicleNumber); });
  
  const uniqueVehiclesInTrips = new Set();
  if (closedLRs) closedLRs.forEach(r => { if (r.vehicle_no) uniqueVehiclesInTrips.add(r.vehicle_no); });
  if (activeLRs) activeLRs.forEach(r => { if (r.vehicle_no) uniqueVehiclesInTrips.add(r.vehicle_no); });
  
  const branches = new Set();
  if (closedLRs) closedLRs.forEach(r => { if (r.branch) branches.add(r.branch); });
  
  const statusValues = new Set();
  if (fleetStatus) fleetStatus.forEach(v => {
    if (Array.isArray(v.status)) v.status.forEach(s => statusValues.add(s));
    else if (v.status) statusValues.add(v.status);
  });
  
  console.log(`\n  Total unique vehicles in fleet status: ${uniqueVehicles.size}`);
  console.log(`  Total unique vehicles in trips: ${uniqueVehiclesInTrips.size}`);
  console.log(`  Total completed trips (closedLRs): ${closedLRs?.length || 0}`);
  console.log(`  Total active trips (activeLRs): ${activeLRs?.length || 0}`);
  console.log(`  Total exceptions: ${exceptions?.length || 0}`);
  console.log(`  Branches: ${Array.from(branches).join(', ')}`);
  console.log(`  Vehicle statuses: ${Array.from(statusValues).join(', ')}`);
  console.log(`  Date range: ${startDate} to ${endDate}`);
  console.log('');
}

main().catch(console.error);
