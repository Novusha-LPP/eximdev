const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/home/aiserver/.gemini/antigravity-ide/brain/d82acc1d-aa69-4334-8059-17459d3eadc8/dispatch_27.json', 'utf8'));

const normalize = (v) => v ? String(v).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

const vehicleMap = new Map();

// Process fleetStatus
if (data.fleetStatus) {
  data.fleetStatus.forEach(v => {
    const no = normalize(v.vehicleNumber);
    if (no) {
      if (!vehicleMap.has(no)) vehicleMap.set(no, { no: v.vehicleNumber, status: [], foundIn: [] });
      vehicleMap.get(no).foundIn.push('fleetStatus');
      const st = Array.isArray(v.status) ? v.status.join(', ') : v.status;
      if (st) vehicleMap.get(no).status.push(st);
    }
  });
}

// Process activeLRs
if (data.activeLRs) {
  data.activeLRs.forEach(r => {
    const no = normalize(r.vehicle_no);
    if (no) {
      if (!vehicleMap.has(no)) vehicleMap.set(no, { no: r.vehicle_no, status: [], foundIn: [] });
      if (!vehicleMap.get(no).foundIn.includes('activeLRs')) vehicleMap.get(no).foundIn.push('activeLRs');
    }
  });
}

// Process closedLRs
if (data.closedLRs) {
  data.closedLRs.forEach(r => {
    const no = normalize(r.vehicle_no);
    if (no) {
      if (!vehicleMap.has(no)) vehicleMap.set(no, { no: r.vehicle_no, status: [], foundIn: [] });
      if (!vehicleMap.get(no).foundIn.includes('closedLRs')) vehicleMap.get(no).foundIn.push('closedLRs');
    }
  });
}

const uniqueCount = vehicleMap.size;
console.log(`Total unique vehicles found across all lists: ${uniqueCount}`);

const statusCounts = {};
const noStatusCount = [];

for (const [key, val] of vehicleMap.entries()) {
  if (val.status.length === 0) {
    noStatusCount.push(val.no);
    statusCounts['No Status Logged'] = (statusCounts['No Status Logged'] || 0) + 1;
  } else {
    // Take the last/only status for grouping
    const st = val.status[val.status.length - 1];
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  }
}

console.log(`\nStatus Distribution of these ${uniqueCount} unique vehicles:`);
for (const [st, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  - ${st}: ${count}`);
}

console.log(`\nVehicles with NO STATUS (found in trips but not in fleetStatus):`);
console.log(noStatusCount.join(', '));
