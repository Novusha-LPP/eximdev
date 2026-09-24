import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import JobModel from '../model/jobModel.mjs';
import updateJobRouter from '../routes/import-dsr/updateJob.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

// Helper to call the route handler in updateJob.mjs directly
function callUpdateJobRoute({ params, body, user }) {
  return new Promise((resolve, reject) => {
    const routeLayer = updateJobRouter.stack.find(
      layer => layer.route && layer.route.path === '/api/update-job/:branch_code/:trade_type/:mode/:year/:jobNo'
    );

    if (!routeLayer) {
      return reject(new Error("Route /api/update-job/:branch_code/:trade_type/:mode/:year/:jobNo not found"));
    }

    // The last handler is the actual controller
    const handlers = routeLayer.route.stack.map(s => s.handle);
    const mainHandler = handlers[handlers.length - 1];

    const req = {
      params,
      body,
      user: user || { role: 'Admin', first_name: 'Test', last_name: 'Admin', username: 'admin' }
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        if (this.statusCode >= 400) {
          reject(new Error(`API Error ${this.statusCode}: ${JSON.stringify(data)}`));
        } else {
          resolve(data);
        }
      },
      send(data) {
        if (this.statusCode >= 400) {
          reject(new Error(`API Error ${this.statusCode}: ${data}`));
        } else {
          resolve(data);
        }
      }
    };

    try {
      mainHandler(req, res, (err) => {
        if (err) reject(err);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function runTest() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB:", uri);

    // Find an existing job or create a test job
    let job = await JobModel.findOne({
      branch_code: { $exists: true, $ne: "" },
      trade_type: { $exists: true, $ne: "" },
      mode: { $exists: true, $ne: "" },
      year: { $exists: true, $ne: "" },
      job_no: { $exists: true, $ne: "" },
      container_nos: { $exists: true, $not: { $size: 0 } }
    });

    let isTempJob = false;
    if (!job) {
      console.log("Creating temporary test job...");
      job = new JobModel({
        job_no: "TEST_DSR_9999",
        job_number: "TEST_DSR_9999",
        branch_code: "AMD",
        trade_type: "IMP",
        mode: "SEA",
        year: "2026-2027",
        container_nos: [
          {
            container_number: "TEMPU9999999",
            size: "20",
            transporter: "",
            transporter_date_time: "",
            srcc_date_time: ""
          }
        ]
      });
      await job.save();
      isTempJob = true;
    }

    const branch_code = job.branch_code;
    const trade_type = job.trade_type;
    const mode = job.mode;
    const year = job.year;
    const jobNo = job.job_no;

    console.log(`\n📋 Testing with Job: ${jobNo} (Branch: ${branch_code}, Trade: ${trade_type}, Mode: ${mode}, Year: ${year})`);
    console.log(`   Initial Containers: ${job.container_nos.length}`);

    const originalContainers = JSON.parse(JSON.stringify(job.container_nos));

    // -------------------------------------------------------------
    // TEST 1: Update via Route to set Transporter = "GOYAM LOGYSTICS"
    // -------------------------------------------------------------
    console.log("\n==================================================");
    console.log("TEST 1: Calling update-job route with GOYAM LOGYSTICS");
    console.log("==================================================");

    const testContainers1 = JSON.parse(JSON.stringify(job.container_nos));
    testContainers1[0].transporter = "GOYAM LOGYSTICS";

    await callUpdateJobRoute({
      params: { branch_code, trade_type, mode, year, jobNo },
      body: {
        container_nos: testContainers1,
        arrival_date: job.arrival_date || "2026-09-10",
        free_time: job.free_time || "14",
        checked: false
      }
    });

    // Verify in DB directly
    let updatedJob = await JobModel.findById(job._id);
    let c1 = updatedJob.container_nos[0];
    console.log("Transporter:", c1.transporter);
    console.log("Transporter Date Time:", c1.transporter_date_time);
    console.log("SRCC Date Time:", c1.srcc_date_time);

    if (!c1.transporter_date_time) {
      throw new Error("❌ TEST 1 FAILED: transporter_date_time was not set by the route!");
    }
    if (c1.srcc_date_time) {
      throw new Error("❌ TEST 1 FAILED: srcc_date_time should be empty for non-SRCC!");
    }
    console.log("✅ TEST 1 PASSED: transporter_date_time correctly set to", c1.transporter_date_time);

    const savedTimestamp1 = c1.transporter_date_time;

    // -------------------------------------------------------------
    // TEST 2: Update arrival_date without changing transporter
    // -------------------------------------------------------------
    console.log("\n==================================================");
    console.log("TEST 2: Updating arrival_date while keeping transporter unchanged");
    console.log("==================================================");

    await new Promise(r => setTimeout(r, 1000)); // wait 1 sec

    const testContainers2 = JSON.parse(JSON.stringify(updatedJob.container_nos));
    testContainers2[0].arrival_date = "2026-09-11";

    await callUpdateJobRoute({
      params: { branch_code, trade_type, mode, year, jobNo },
      body: {
        container_nos: testContainers2,
        arrival_date: "2026-09-11",
        free_time: job.free_time || "14",
        checked: false
      }
    });

    updatedJob = await JobModel.findById(job._id);
    let c2 = updatedJob.container_nos[0];
    console.log("Transporter:", c2.transporter);
    console.log("Arrival Date:", c2.arrival_date);
    console.log("Transporter Date Time:", c2.transporter_date_time);

    if (c2.transporter_date_time !== savedTimestamp1) {
      throw new Error(`❌ TEST 2 FAILED: Timestamp changed! Old: ${savedTimestamp1}, New: ${c2.transporter_date_time}`);
    }
    console.log("✅ TEST 2 PASSED: Timestamp was strictly preserved!");

    // -------------------------------------------------------------
    // TEST 3: Switching transporter to "SRCC"
    // -------------------------------------------------------------
    console.log("\n==================================================");
    console.log("TEST 3: Switching transporter to SRCC");
    console.log("==================================================");

    await new Promise(r => setTimeout(r, 1000));

    const testContainers3 = JSON.parse(JSON.stringify(updatedJob.container_nos));
    testContainers3[0].transporter = "SRCC";

    await callUpdateJobRoute({
      params: { branch_code, trade_type, mode, year, jobNo },
      body: {
        container_nos: testContainers3,
        arrival_date: "2026-09-11",
        free_time: job.free_time || "14",
        checked: false
      }
    });

    updatedJob = await JobModel.findById(job._id);
    let c3 = updatedJob.container_nos[0];
    console.log("Transporter:", c3.transporter);
    console.log("Transporter Date Time:", c3.transporter_date_time);
    console.log("SRCC Date Time:", c3.srcc_date_time);

    if (!c3.transporter_date_time || !c3.srcc_date_time) {
      throw new Error("❌ TEST 3 FAILED: Both transporter_date_time and srcc_date_time should be set for SRCC!");
    }
    if (c3.transporter_date_time === savedTimestamp1) {
      throw new Error("❌ TEST 3 FAILED: transporter_date_time should be updated when transporter changes!");
    }
    console.log("✅ TEST 3 PASSED: Both timestamps set for SRCC!");

    // -------------------------------------------------------------
    // TEST 4: Clearing transporter
    // -------------------------------------------------------------
    console.log("\n==================================================");
    console.log("TEST 4: Clearing transporter");
    console.log("==================================================");

    const testContainers4 = JSON.parse(JSON.stringify(updatedJob.container_nos));
    testContainers4[0].transporter = "";

    await callUpdateJobRoute({
      params: { branch_code, trade_type, mode, year, jobNo },
      body: {
        container_nos: testContainers4,
        arrival_date: "2026-09-11",
        free_time: job.free_time || "14",
        checked: false
      }
    });

    updatedJob = await JobModel.findById(job._id);
    let c4 = updatedJob.container_nos[0];
    console.log("Transporter:", c4.transporter);
    console.log("Transporter Date Time:", c4.transporter_date_time);
    console.log("SRCC Date Time:", c4.srcc_date_time);

    if (c4.transporter_date_time || c4.srcc_date_time) {
      throw new Error("❌ TEST 4 FAILED: Timestamps should be cleared when transporter is cleared!");
    }
    console.log("✅ TEST 4 PASSED: Timestamps successfully cleared!");

    // Restore original state
    if (isTempJob) {
      await JobModel.findByIdAndDelete(job._id);
      console.log("\n🧹 Cleaned up temporary test job.");
    } else {
      await JobModel.findByIdAndUpdate(job._id, { $set: { container_nos: originalContainers } });
      console.log("\n🧹 Restored original container state in DB.");
    }

    console.log("\n==================================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY VIA THE ROUTE!");
    console.log("==================================================");
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
