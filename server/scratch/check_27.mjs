import https from 'https';
import fs from 'fs';

const TRANSPORT_BASE = 'https://eximbot.alvision.in/transport';
const API_KEY = '1234567890';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'x-api-key': API_KEY } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse JSON`)); }
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  const date = '2026-06-27';
  const dispatchUrl = `${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range?startDate=${date}&endDate=${date}`;
  const utilUrl = `${TRANSPORT_BASE}/api/fleet/utilization-report?startDate=${date}&endDate=${date}`;
  
  const dispatchData = await fetchJSON(dispatchUrl);
  const utilData = await fetchJSON(utilUrl);
  
  fs.writeFileSync('dispatch_27.json', JSON.stringify(dispatchData, null, 2));
  fs.writeFileSync('util_27.json', JSON.stringify(utilData, null, 2));
  
  console.log('Saved dispatch_27.json and util_27.json');
  
  const fleetStatus = dispatchData.fleetStatus || [];
  const closedLRs = dispatchData.closedLRs || [];
  const activeLRs = dispatchData.activeLRs || [];
  
  console.log(`\n--- DATA FOR ${date} ---`);
  console.log(`totalFleet API:`, utilData?.data?.totalFleet);
  console.log(`fleetStatus API array length:`, fleetStatus.length);
  console.log(`closedLRs (Total Trips) length:`, closedLRs.length);
  console.log(`activeLRs length:`, activeLRs.length);
  
  const statuses = {};
  fleetStatus.forEach(v => {
    const s = String(v.status || '').trim();
    statuses[s] = (statuses[s] || 0) + 1;
  });
  console.log(`\nFleet Status breakdown in raw data:`);
  console.log(statuses);
}

main().catch(console.error);
