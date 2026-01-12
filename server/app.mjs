import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import logger from "./logger.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import compression from "compression";
import cluster from "cluster";
import os from "os";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import http from "http";
import { setupJobOverviewWebSocket } from "./setupJobOverviewWebSocket.mjs";
import monthlyContainersRouter from "./routes/report/monthlyContainers.mjs";
import monthlyClearanceRouter from "./routes/report/importClearanceMonthly.mjs";
import { initConnections, getConnection } from "./utils/connectionManager.mjs";
import { branchContext } from "./utils/branchContext.mjs";

// Import routes
import getAllUsers from "./routes/getAllUsers.mjs";
import getImporterList from "./routes/getImporterList.mjs";
import getSupplierExporterList from "./routes/getSupplierExporterList.mjs";
import getJobById from "./routes/getJobById.mjs";
import getUser from "./routes/getUser.mjs";
import getUserData from "./routes/getUserData.mjs";
import updateProfilePhoto from "./routes/user/updateProfilePhoto.mjs";
import getYears from "./routes/getYears.mjs";
import login from "./routes/login.mjs";
import me from "./routes/me.mjs";
import handleS3Deletation from "./routes/handleS3Deletation.mjs";
import updateDutyFromCth from "./routes/jobs/updateDutyFromCth.mjs";

// charges
import Charges from "./routes/ChargesSection/ChargesSection.js";

// Accounts
import Accounts from "./routes/accounts/accounts.js";
import reminderRoutes, {
  initReminderSystem,
} from "./routes/accounts/remiderRoutes.js";
import accountLedger from "./routes/accounts/Ledger/accountLedger.mjs";

// Documentation
import updateDocumentationJob from "./routes/documentation/updateDocumentationJob.mjs";
import getDocumentationjobs from "./routes/documentation/getDocumentationjobs.mjs";
import getDocumentationCompletedJobs from "./routes/documentation/getDocumentationCompletedJobs.mjs";

// Employee KYC
import completeKyc from "./routes/employee-kyc/completeKyc.mjs";
import kycApproval from "./routes/employee-kyc/kycApproval.mjs";
import viewAllKycs from "./routes/employee-kyc/viewAllKycs.mjs";

// Employee Onboarding
import onboardEmployee from "./routes/employee-onboarding/onboardEmployee.mjs";
import completeOnboarding from "./routes/employee-onboarding/completeOnboarding.mjs";
import viewOnboardings from "./routes/employee-onboarding/viewOnboardings.mjs";

// e-Sanchit
import getCthDocs from "./routes/e-sanchit/getCthDocuments.mjs";
import getDocs from "./routes/e-sanchit/getDocs.mjs";
import getESanchitJobs from "./routes/e-sanchit/getESanchitJobs.mjs";
import getESanchitCompletedJobs from "./routes/e-sanchit/getESanchitCompletedJobs.mjs";
import getJobDetail from "./routes/e-sanchit/getJobDetail.mjs";
import updateESanchitJob from "./routes/e-sanchit/updateESanchitJob.mjs";

// import - billing
import getImportBilling from "./routes/import-billing/getImportBilling.js";

// Home
import assignModules from "./routes/home/assignModules.mjs";
import assignRole from "./routes/home/assignRole.mjs";
import unassignModule from "./routes/home/unassignModules.mjs";
import changePassword from "./routes/home/changePassword.mjs";
import assignIcdCode from "./routes/home/assignIcdCode.mjs";
import assignEximBot from "./routes/home/assignEximBot.mjs";
import assignBranch from "./routes/home/assignBranch.mjs";

// ImportersInfo
import ImportersInfo from "./routes/importers-Info/importersInfo.mjs";

// Import DO
import doTeamListOfjobs from "./routes/import-do/doTeamListOfjobs.mjs";
import getDoBilling from "./routes/import-do/getDoBilling.mjs";
import freeDaysConf from "./routes/import-do/freeDaysConf.mjs";
import getDoModuleJobs from "./routes/import-do/getDoModuleJobs.mjs";
import updateDoBilling from "./routes/import-do/updateDoBilling.mjs";
import updateDoListRouter from "./routes/import-do/updateDoList.mjs";
import updateDoPlanning from "./routes/import-do/updateDoPlanning.mjs";
import getKycDocuments from "./routes/import-do/getKycDocuments.mjs";
import getShippingLines from "./routes/getShippingLines.mjs";
import getKycDocsByImporter from "./routes/import-do/getKycDocsByImporter.mjs";
import getKycDocsByShippingLine from "./routes/import-do/getKycDocsByShippingLine.mjs";
import getKycAndBondStatus from "./routes/import-do/getKycAndBondStatus.mjs";
import updateDoContainer from "./routes/import-do/updateDoContainer.mjs";
import updateAdvancedPayment from "./routes/import-do/updateAdvancedPayment.mjs";

// Import DSR
import addJobsFromExcel from "./routes/import-dsr/addJobsFromExcel.mjs";
import downloadReport from "./routes/import-dsr/downloadReport.mjs";
import downloadAllReport from "./routes/import-dsr/downloadAllReport.mjs";
import getAssignedImporter from "./routes/import-dsr/getAssignedImporter.mjs";
import getImporterJobs from "./routes/import-dsr/getImporterJobs.mjs";
import getImporterUsers from "./routes/import-dsr/getImporterUsers.mjs";
import getJob from "./routes/import-dsr/getJob.mjs";
import getJobList from "./routes/import-dsr/getJobList.mjs";
import getJobsOverview from "./routes/import-dsr/getJobsOverview.mjs";
import getLastJobsDate from "./routes/import-dsr/getLastJobsDate.mjs";
import importerListToAssignJobs from "./routes/import-dsr/importerListToAssignJobs.mjs";
import updateJob from "./routes/import-dsr/updateJob.mjs";
import viewDSR from "./routes/import-dsr/viewDSR.mjs";
// import ImportCreateJob from "./routes/import-dsr/ImportCreateJob.mjs";

// Import Operations
import getOperationPlanningJobs from "./routes/import-operations/getOperationPlanningJobs.mjs";
import completedOperation from "./routes/import-operations/CompletedOperation.mjs";
import updateOperationsJob from "./routes/import-operations/updateOperationsJob.mjs";
import getOperationPlanningList from "./routes/import-operations/getOperationPlanningList.mjs";

// Inward Register
import addInwardRegister from "./routes/inward-register/addInwardRegister.mjs";
import getContactPersonNames from "./routes/inward-register/getContactPersonNames.mjs";
import getInwardRegisters from "./routes/inward-register/getInwardRegisters.mjs";
import handleStatus from "./routes/inward-register/handleStatus.mjs";

// Outward Register
import addOutwardRegister from "./routes/outward-register/addOutwardRegister.mjs";
import getOutwardRegisters from "./routes/outward-register/getOutwardRegister.mjs";
import getOutwardRegisterDetails from "./routes/outward-register/getOutwardRegisterDetails.mjs";
import updateOutwardRegister from "./routes/outward-register/updateOutwardRegister.mjs";

// Exit Interview
import addExitInterview from "./routes/exit-interview/addExitInterview.mjs";
import ViewExitInterviews from "./routes/exit-interview/viewExitInterviews.mjs";

// Submission
import getSubmissionJobs from "./routes/submission/getSubmissionJobs.mjs";
import updateSubmissionJob from "./routes/submission/updateSubmissionJob.mjs";

// Report
import getPenaltyReport from "./routes/report/getPenaltyReport.mjs";
import getBillingPendingReport from "./routes/report/getBillingPendingReport.mjs";

// Audit Trail
import auditTrail from "./routes/audit/auditTrail.mjs";

//import utility tool
import getCthSearch from "./routes/CthUtil/getChtSearch.js";
import dutyCalculator from "./routes/CthUtil/dutycalculator.mjs";

//proxy apis
import icegateProxy from "./routes/icegateProxy.js";

//release notes
import releaseNoteRoutes from "./routes/releaseNoteRoutes.js";

// feedback
import feedback from "./routes/feedbackRoutes.js";

//scrapper
import cron from "node-cron";
import { scrapeAndSaveCurrencyRates } from "./services/currencyRateScraper.js";

import currencyRateRoutes from "./routes/currencyRate.js";

// Open Points Module
import openPointsRoutes from "./routes/open-points/openPointsRoutes.mjs";

import analyticsRoutes from "./routes/analytics/analyticsRoutes.mjs";
import uploadFileRoutes from "./routes/upload/uploadFile.mjs";

// Project Nucleus
import nucleusReports from "./routes/project-nucleus/nucleusReports.mjs";

// Configuration is handled at the very top

let nodeProfilingIntegration;
try {
  if (
    process.env.DISABLE_SENTRY_PROFILING !== "true" &&
    process.platform === "linux"
  ) {
    const profilingMod = await import("@sentry/profiling-node");
    nodeProfilingIntegration = profilingMod.nodeProfilingIntegration;
  }
} catch (e) {
  console.warn(
    "Sentry profiling integration not available:",
    e && e.message ? e.message : e
  );
}

process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
});

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: nodeProfilingIntegration ? [nodeProfilingIntegration()] : [],
  tracesSampleRate: 1.0, // Capture 100% of transactions for tracing
  profilesSampleRate: nodeProfilingIntegration ? 1.0 : 0.0, // Enable profiling only when integration available
});

// SSE
// import updateJobCount from "./routes/updateJobCount.mjs";

// Disable clustering for development/debugging to see logs clearly
// const numOfCPU = os.availableParallelism();
// if (cluster.isPrimary) {
//   for (let i = 0; i < numOfCPU; i++) {
//     cluster.fork();
//   }
//   cluster.on("exit", (worker) => {
//     cluster.fork();
//   });
// } else {
const app = express();

app.use(bodyParser.json({ limit: "100mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* 
app.use((req, res, next) => {
  const isBrowserRequest =
    req.headers["user-agent"] &&
    req.headers["user-agent"].includes("Mozilla");

  // For sensitive routes, block direct browser access
  if (
    req.path.startsWith("/api/") &&
    isBrowserRequest &&
    !req.xhr &&
    req.headers.accept.indexOf("html") > -1
  ) {
    return res.status(403).send("Forbidden: Direct browser access to APIs is not allowed.");
  }
  next();
});
*/
app.use((req, res, next) => next());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://exim.novusha.in",
      "https://exim.novusha.com",
      "http://192.168.1.18:3000",
      "http://192.168.29.172:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-branch", "x-username", "Accept", "X-Requested-With"],
    exposedHeaders: ["x-branch", "x-username"],
  })
);

app.use((req, res, next) => {
  const branch = req.headers["x-branch"] || "AHMEDABAD HO";
  branchContext.run(branch, next);
});

app.use(compression({ level: 9 }));

mongoose.set("strictQuery", true);

initConnections()
  .then(async () => {
    Sentry.setupExpressErrorHandler(app);

    // Optional fallthrough error handler
    app.use(function onError(err, req, res, next) {
      res.status(500).end(res.sentry + "\n");
    });

    // routes usage
    app.use(getAllUsers);
    app.use(getImporterList);
    app.use(getSupplierExporterList);
    app.use(getJobById);
    app.use(getUser);
    app.use(getUserData);
    app.use(updateProfilePhoto);
    app.use(getYears);
    app.use(login);
    app.use(me);
    app.use(handleS3Deletation);
    app.use(updateDutyFromCth);

    // Charges
    app.use(Charges);

    // Accounts
    app.use(Accounts);
    app.use(reminderRoutes);
    app.use(accountLedger);

    // Documentation
    app.use(updateDocumentationJob);
    app.use(getDocumentationjobs);
    app.use(getDocumentationCompletedJobs);

    // Employee KYC
    app.use(completeKyc);
    app.use(kycApproval);
    app.use(viewAllKycs);

    // Employee Onboarding
    app.use(onboardEmployee);
    app.use(completeOnboarding);
    app.use(viewOnboardings);

    // e-Sanchit
    app.use(getCthDocs);
    app.use(getDocs);
    app.use(getESanchitJobs);
    app.use(getESanchitCompletedJobs);
    app.use(getJobDetail);
    app.use(updateESanchitJob);

    // import billing
    app.use(getImportBilling);

    // Home
    app.use(assignModules);
    app.use(assignRole);
    app.use(unassignModule);
    app.use(changePassword);
    app.use(assignIcdCode);
    app.use(assignEximBot);
    app.use(assignBranch);

    // ImportersInfo
    app.use(ImportersInfo);

    // Import DO
    app.use(doTeamListOfjobs);
    app.use(getDoBilling);
    app.use(freeDaysConf);
    app.use(getDoModuleJobs);
    app.use(updateDoBilling);
    app.use(updateDoListRouter);
    app.use(updateDoPlanning);
    app.use(getKycDocuments);
    app.use(getShippingLines);
    app.use(getKycDocsByImporter);
    app.use(getKycDocsByShippingLine);
    app.use(getKycAndBondStatus);
    app.use(updateDoContainer);
    app.use(updateAdvancedPayment);

    // Import DSR
    app.use(addJobsFromExcel);
    app.use(downloadReport);
    app.use(downloadAllReport);
    app.use(getAssignedImporter);
    app.use(getImporterJobs);
    app.use(getImporterUsers);
    app.use(getJob);
    app.use(getJobList);
    app.use(getJobsOverview);
    app.use(getLastJobsDate);
    app.use(importerListToAssignJobs);
    app.use(updateJob);
    app.use(viewDSR);
    // app.use(ImportCreateJob);

    // Import Operations
    app.use(getOperationPlanningJobs);
    app.use(completedOperation);
    app.use(updateOperationsJob);
    app.use(getOperationPlanningList);

    // Inward Register
    app.use(addInwardRegister);
    app.use(getContactPersonNames);
    app.use(getInwardRegisters);
    app.use(handleStatus);

    // Outward Register
    app.use(addOutwardRegister);
    app.use(getOutwardRegisters);
    app.use(getOutwardRegisterDetails);
    app.use(updateOutwardRegister);

    // Exit Interview
    app.use(addExitInterview);
    app.use(ViewExitInterviews);

    // Submission
    app.use(getSubmissionJobs);
    app.use(updateSubmissionJob);

    // Report
    app.use(getPenaltyReport);
    app.use(getBillingPendingReport);
    app.use(monthlyContainersRouter);
    app.use(monthlyClearanceRouter);

    // Audit Trail
    app.use(auditTrail);

    // utility tool
    app.use(getCthSearch);
    app.use(dutyCalculator);

    // proxy apis
    app.use(icegateProxy);

    // release notes api
    app.use(releaseNoteRoutes);

    // feedback
    app.use(feedback);

    app.use(currencyRateRoutes);

    // Open Points
    app.use(openPointsRoutes);

    app.use(analyticsRoutes);

    app.use(uploadFileRoutes);

    // Nucleus
    app.use(nucleusReports);

    const server = http.createServer(app);

    // Initialize the reminder system and cron jobs ONLY on the first worker
    if (!cluster.worker || cluster.worker.id === 1) {
      initReminderSystem();

      // cron 10:00 every day
      cron.schedule("0 10 * * *", async () => {
        logger.info("Running daily currency rate scrape task");
        try {
          await scrapeAndSaveCurrencyRates();
          logger.info("Daily currency rate scrape task completed successfully");
        } catch (error) {
          logger.error("Error in daily currency rate scrape task", {
            error: error.message,
            stack: error.stack,
          });
        }
      });
      logger.info("Background tasks (Reminders, Cron) initialized on Worker 1");
    }

    setupJobOverviewWebSocket(server);

    const port = process.env.PORT || 9000;
    server.listen(port, () => {
      console.log(`🟢 Server listening on http://localhost:${port}`);
      logger.info(`Server started and listening on port ${port}...`);
    });
  })
  .catch((err) => {
    console.error(`❌ Database connection error:`, err.message);
    logger.error(`Database connection error:`, err);
  });
// }
