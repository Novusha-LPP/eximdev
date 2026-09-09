/**
 * migrate_license_utilization.mjs
 * 
 * Migrates existing inline utilization_records from AuthorizationRegistrationModel
 * into the new LicenseUtilizationModel collection, resolving job_id associations.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import AuthorizationRegistrationModel from "../model/authorizationRegistrationModel.mjs";
import LicenseUtilizationModel from "../model/licenseUtilizationModel.mjs";
import JobModel from "../model/jobModel.mjs";
import { recalculateLicenseUtilization } from "../services/licenseUtilizationService.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://0.0.0.0:27017/eximdev";

async function runMigration() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI, { maxPoolSize: 10 });
    console.log("Connected to MongoDB.");

    // Find all authorizations containing utilization_records
    const authorizations = await AuthorizationRegistrationModel.find({
      $or: [
        { "utilization_records.0": { $exists: true } },
        { "boe_details": { $exists: true } }
      ]
    });

    console.log(`Found ${authorizations.length} authorizations to migrate.`);

    let totalMigratedCount = 0;

    for (const auth of authorizations) {
      const authNo = auth.registration_no || auth.licence_no;
      if (!authNo) continue;

      const recordsToMigrate = auth.utilization_records || [];
      console.log(`\nProcessing Authorization: "${authNo}" with ${recordsToMigrate.length} legacy records.`);

      for (const rec of recordsToMigrate) {
        // Resolve job_id by looking up job_no or job_number
        let resolvedJobId = rec.job_id;

        if (!resolvedJobId && rec.job_no) {
          const job = await JobModel.findOne({
            $or: [
              { job_no: rec.job_no },
              { job_number: rec.job_no }
            ]
          }).select("_id").lean();

          if (job) {
            resolvedJobId = job._id;
          }
        }

        if (!resolvedJobId) {
          console.warn(`[Warning] Could not resolve job_id for job_no: "${rec.job_no}". Skipping record.`);
          continue;
        }

        // Check if record already exists to prevent duplicates
        const exists = await LicenseUtilizationModel.findOne({
          authorization_no: authNo,
          license_sr: rec.sr_no || 1,
          job_id: resolvedJobId
        });

        if (!exists) {
          await LicenseUtilizationModel.create({
            authorization_no: authNo,
            license_sr: rec.sr_no || 1,
            job_no: rec.job_no || "",
            job_id: resolvedJobId,
            be_no: rec.be_no || "",
            be_date: rec.be_date || "",
            hs_code: rec.hs_code || "",
            item_description: rec.item_description || "",
            qty: rec.qty || 0,
            unit: rec.unit || "",
            cif_usd: rec.cif_usd || 0,
            cif_inr: rec.cif_inr || 0,
            exchange_rate_used: rec.exchange_rate_used || 84,
            port: rec.port || "",
            created_at: rec.created_at || new Date()
          });
          totalMigratedCount++;
        }
      }

      // Recalculate summaries for this license
      await recalculateLicenseUtilization(authNo);
    }

    console.log(`\nMigration completed successfully. Migrated ${totalMigratedCount} records.`);
  } catch (err) {
    console.error("Migration failed with error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runMigration();
