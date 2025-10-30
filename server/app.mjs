import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import logger from "./logger.js";
import axios from 'axios';


process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
});

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import compression from "compression";
import cluster from "cluster";
import os from "os";
import bodyParser from "body-parser";
import http from "http";
import { setupJobOverviewWebSocket } from "./setupJobOverviewWebSocket.mjs";
import monthlyContainersRouter from "./routes/report/monthlyContainers.mjs";
import monthlyClearanceRouter from "./routes/report/importClearanceMonthly.mjs";

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0, // Capture 100% of transactions for tracing
  profilesSampleRate: 1.0, // Capture 100% of transactions for profiling
});

// SSE
// import updateJobCount from "./routes/updateJobCount.mjs";

// Import routes
import getAllUsers from "./routes/getAllUsers.mjs";
import getImporterList from "./routes/getImporterList.mjs";
import getJobById from "./routes/getJobById.mjs";
import getUser from "./routes/getUser.mjs";
import getUserData from "./routes/getUserData.mjs";
import getYears from "./routes/getYears.mjs";
import login from "./routes/login.mjs";
import handleS3Deletation from "./routes/handleS3Deletation.mjs";
import updateDutyFromCth from "./routes/jobs/updateDutyFromCth.mjs";

// charges 
import Charges from "./routes/ChargesSection/ChargesSection.js";

// Accounts
import Accounts from "./routes/accounts/accounts.js";
import reminderRoutes from './routes/accounts/remiderRoutes.js';
import accountLedger from './routes/accounts/Ledger/accountLedger.mjs'


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

// ImportersInfo
import ImportersInfo from "./routes/importers-Info/importersInfo.mjs";

// Import DO
import doTeamListOfjobs from "./routes/import-do/doTeamListOfjobs.mjs";
import getDoBilling from "./routes/import-do/getDoBilling.mjs";
import freeDaysConf from "./routes/import-do/freeDaysConf.mjs";
import getDoModuleJobs from "./routes/import-do/getDoModuleJobs.mjs";
import updateDoBilling from "./routes/import-do/updateDoBilling.mjs";
import updateDoListRouter from './routes/import-do/updateDoList.mjs';
import updateDoPlanning from "./routes/import-do/updateDoPlanning.mjs";
import getKycDocuments from "./routes/import-do/getKycDocuments.mjs";
import getShippingLines from "./routes/getShippingLines.mjs";
import getKycDocsByImporter from "./routes/import-do/getKycDocsByImporter.mjs";
import getKycDocsByShippingLine from "./routes/import-do/getKycDocsByShippingLine.mjs";
import getKycAndBondStatus from "./routes/import-do/getKycAndBondStatus.mjs";
import updateDoContainer from "./routes/import-do/updateDoContainer.mjs";

// Import DSR
import addJobsFromExcel from "./routes/import-dsr/addJobsFromExcel.mjs";
import downloadReport from "./routes/import-dsr/downloadReport.mjs";
import downloadAllReport from "./routes/import-dsr/downloadAllReport.mjs";
import getAssignedImporter from "./routes/import-dsr/getAssignedImporter.mjs";
import getImporterJobs from "./routes/import-dsr/getImporterJobs.mjs";
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

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
    ? process.env.SERVER_MONGODB_URI
    : process.env.DEV_MONGODB_URI;

// const CLIENT_URI =
//   process.env.NODE_ENV === "production"
//     ? process.env.PROD_CLIENT_URI
//     : process.env.NODE_ENV === "server"
//     ? process.env.SERVER_CLIENT_URI
//     : process.env.DEV_CLIENT_URI;

const numOfCPU = os.availableParallelism();
if (cluster.isPrimary) {
  for (let i = 0; i < numOfCPU; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    cluster.fork();
  });
} else {
  const app = express();

  app.use(bodyParser.json({ limit: "100mb" }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
      return res.status(404).send("Not found");
    }

    next();
  });
  app.use(
    cors({
      origin: [
        "http://eximdev.s3-website.ap-south-1.amazonaws.com",
        "http://localhost:3000",
        "http://test-ssl-exim.s3-website.ap-south-1.amazonaws.com",
      ],
      credentials: true,
      // Allow custom headers for audit trail
      exposedHeaders: ['Content-Type', 'Authorization'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization',
        'user-id',
        'username',
        'user-role',
        'x-username'
      ],
    })
  );

  app.use(compression({ level: 9 }));

  mongoose.set("strictQuery", true);

  mongoose
    .connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      minPoolSize: 10,
      maxPoolSize: 1000,
    })
    .then(async () => {
      Sentry.setupExpressErrorHandler(app);

      // Optional fallthrough error handler
      app.use(function onError(err, req, res, next) {
        res.statusCode = 500;
        res.end(res.sentry + "\n");
      });

      app.get("/", async (req, res) => {
        try {
          // Update all documents where bill_no is "--" and set bill_no to an empty string
          const result = await JobModel.updateMany(
            { bill_no: "--" },
            { $set: { bill_no: "" } }
          );

          // Find and return the updated documents
          const updatedJobs = await JobModel.find({ bill_no: "" });

          res.send(updatedJobs);
        } catch (error) {
          res.status(500).send("An error occurred while updating the jobs");
        }
      });
      // app.use(updateJobCount);
      app.use(getAllUsers);
      app.use(getImporterList);      
      app.use(getJobById);
      app.use(updateDutyFromCth);
      app.use(getUser);
      app.use(getUserData);
      app.use(getYears);
      app.use(login);

      // handle delete
      app.use(handleS3Deletation);

      // charges
      app.use(Charges);

      // Accounts

      app.use("/api",Accounts);
      app.use('/api', reminderRoutes);
      app.use('/api', accountLedger);

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

      // E-Sanchit
      app.use(getCthDocs);
      app.use(getDocs);
      app.use(getESanchitJobs);
      app.use(getESanchitCompletedJobs);
      app.use(getJobDetail);
      app.use(updateESanchitJob);

      // Home
      app.use(assignModules);
      app.use(assignRole);
      app.use(unassignModule);
      app.use(changePassword);
      app.use(assignIcdCode);

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

      // Import DSR
      app.use(addJobsFromExcel);
      app.use(downloadReport);
      app.use(downloadAllReport);
      app.use(getAssignedImporter);
      app.use(getImporterJobs);
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

      // import billing
      app.use(getImportBilling);

      // import cth search
      app.use(getCthSearch);
      app.use(dutyCalculator);

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

      // Exit Feedback
      app.use(addExitInterview);
      app.use(ViewExitInterviews);

      // Submission
      app.use(updateSubmissionJob);
      app.use(getSubmissionJobs);      
      // Report
      app.use(getPenaltyReport);
      app.use(getBillingPendingReport);
      app.use( monthlyContainersRouter);
      app.use(monthlyClearanceRouter);


      //auditrail
      app.use(auditTrail);

app.post('/api/be-details', async (req, res) => {
  console.log('Received BE details request:', req.body);
  
  try {
    const { location, beNo, beDt } = req.body;

    // Validate required fields
    if (!location || !beNo || !beDt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: location, beNo, beDt'
      });
    }

    // Format date to YYYYMMDD (remove dashes)
    const formattedDate = beDt.replace(/-/g, '');

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Origin': 'https://foservices.icegate.gov.in',
      'Referer': 'https://foservices.icegate.gov.in/#/public-enquiries/document-status/ds-bill-of-entry',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Create URL-encoded form data - try different parameter names
    const formData = new URLSearchParams();
    
    // Try different parameter combinations based on common ICEGATE patterns
    formData.append('location', location);
    formData.append('beNo', beNo);
    formData.append('beDt', formattedDate);
    
    // Also try alternative parameter names
    formData.append('beDate', formattedDate);
    formData.append('beno', beNo);
    formData.append('loc', location);

    console.log('Making request to ICEGATE API with data:', {
      location,
      beNo, 
      beDt: formattedDate
    });

    const response = await axios.post(
      'https://foservices.icegate.gov.in/enquiry/publicEnquiries/BETrack_Ices_action_Public',
      formData,
      {
        headers,
        timeout: 30000,
        validateStatus: (status) => true // Don't throw on any status
      }
    );

    console.log('ICEGATE API response status:', response.status);
    console.log('ICEGATE API response headers:', response.headers);
    
    if (response.status === 200 && response.data) {
      res.json({
        success: true,
        status: response.status,
        data: response.data
      });
    } else {
      // Try alternative approach with JSON content type
      console.log('Trying alternative approach with JSON...');
      
      const jsonResponse = await axios.post(
        'https://foservices.icegate.gov.in/enquiry/publicEnquiries/BETrack_Ices_action_Public',
        {
          location,
          beNo,
          beDt: formattedDate
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://foservices.icegate.gov.in',
            'Referer': 'https://foservices.icegate.gov.in/#/public-enquiries/document-status/ds-bill-of-entry'
          },
          timeout: 30000,
          validateStatus: (status) => true
        }
      );

      if (jsonResponse.status === 200 && jsonResponse.data) {
        res.json({
          success: true,
          status: jsonResponse.status,
          data: jsonResponse.data
        });
      } else {
        res.status(jsonResponse.status).json({
          success: false,
          error: `ICEGATE API returned status: ${jsonResponse.status}`,
          data: jsonResponse.data
        });
      }
    }

  } catch (error) {
    console.error('API Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: `ICEGATE API error: ${error.response.status}`,
        details: error.response.data
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        success: false,
        error: 'Request timeout'
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Network error: ${error.message}`
      });
    }
  }
});

      // Initialize WebSocket logic
      const server = http.createServer(app);
      setupJobOverviewWebSocket(server);

      server.listen(9000, () => {
        console.log(`🟢 Server listening on http://localhost:${9000}`);
      });
    })
    .catch((err) => console.log("Error connecting to MongoDB Atlas:", err));

  // server.listen(9000, () => {
  //   console.log(`🟢 Server listening on http://localhost:${9000}`);
  // }) .catch((err) => console.log("Error connecting to MongoDB Atlas:", err));

  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("Mongoose connection closed due to app termination");
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await mongoose.connection.close();
    console.log("Mongoose connection closed due to app termination");
    process.exit(0);
  });
}
