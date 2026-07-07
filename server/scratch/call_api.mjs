import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import importBillingRouter from '../routes/import-billing/getImportBilling.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const uri = process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.DEV_MONGODB_URI;
  await mongoose.connect(uri);

  const req = {
    query: {
      limit: 1000, // Large limit to get all jobs
    },
    user: {
      role: 'Admin', // Admin bypasses branch filters
      authorizedBranchIds: []
    }
  };

  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      processData(data);
    }
  };

  // Find the exact handler for /api/get-billing-import-job
  const route = importBillingRouter.stack.find(
    layer => layer.route && layer.route.path === '/api/get-billing-import-job'
  );

  if (!route) {
    console.error("Route not found");
    process.exit(1);
  }

  // The route might have multiple handlers (e.g. applyUserIcdFilter, then the main handler)
  // We'll execute them in sequence
  const handlers = route.route.stack.map(s => s.handle);
  
  let i = 0;
  function next(err) {
    if (err) {
      console.error(err);
      return;
    }
    if (i < handlers.length) {
      const handler = handlers[i++];
      handler(req, res, next);
    }
  }
  
  next();
}

function processData(responseData) {
  if (responseData.message) {
    console.error("Error from API:", responseData.message);
    process.exit(1);
  }

  const jobs = responseData.jobs || [];
  const totalJobs = responseData.totalJobs;

  const customHouseCounts = {};
  const importerCounts = {};
  let airCount = 0;
  let seaCount = 0;

  jobs.forEach(j => {
    const ch = j.custom_house || "Unknown";
    customHouseCounts[ch] = (customHouseCounts[ch] || 0) + 1;
    
    const imp = j.importer || "Unknown";
    importerCounts[imp] = (importerCounts[imp] || 0) + 1;
    
    const mode = (j.mode || "").toUpperCase();
    if (mode === "AIR") {
      airCount++;
    } else {
      seaCount++;
    }
  });

  const sortedCustomHouses = Object.entries(customHouseCounts).sort((a, b) => b[1] - a[1]);
  const sortedImporters = Object.entries(importerCounts).sort((a, b) => b[1] - a[1]);

  console.log("Pending Import Billing Jobs Summary");
  console.log("Based on the latest data from the Import Billing module, here is the summary of the pending jobs.\n");
  console.log("Overall Status");
  console.log(`Total Pending Jobs: ${totalJobs}`);
  console.log("Status Breakdown:");
  console.log(`Billing Pending: ${totalJobs}\n`);
  
  console.log("Breakdown by Custom House");
  console.log("Custom House\tPending Job Count");
  sortedCustomHouses.forEach(([ch, count]) => {
    console.log(`${ch}\t${count}`);
  });
  console.log("\nBreakdown by Importer");
  console.log("Here are the importers with pending billing jobs, sorted from highest to lowest volume:\n");
  console.log("Importer Name\tPending Job Count");
  sortedImporters.forEach(([imp, count]) => {
    console.log(`${imp}\t${count}`);
  });
  
  console.log("\n\nin import billing");
  console.log(`air Job Count: ${airCount}\n`);
  console.log(`and sea Job Count: ${seaCount}`);

  mongoose.disconnect();
}

run().catch(console.error);
