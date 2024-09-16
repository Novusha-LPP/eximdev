import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import logger from "./logger.js";

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
dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0, // Capture 100% of transactions for tracing
  profilesSampleRate: 1.0, // Capture 100% of transactions for profiling
});

// Import routes
import getAllUsers from "./routes/getAllUsers.mjs";
import getImporterList from "./routes/getImporterList.mjs";
import getJobById from "./routes/getJobById.mjs";
import getUser from "./routes/getUser.mjs";
import getUserData from "./routes/getUserData.mjs";
import getYears from "./routes/getYears.mjs";
import login from "./routes/login.mjs";

// Accounts
import addAdani from "./routes/accounts/addAdani.mjs";
import addAMC from "./routes/accounts/addAMC.mjs";
import addCC from "./routes/accounts/addCC.mjs";
import addElectricity from "./routes/accounts/addElectricity.mjs";
import addFD from "./routes/accounts/addFD.mjs";
import addLIC from "./routes/accounts/addLIC.mjs";
import addMobile from "./routes/accounts/addMobile.mjs";
import addRent from "./routes/accounts/addRent.mjs";
import getAdani from "./routes/accounts/getAdani.mjs";
import getAMC from "./routes/accounts/addAMC.mjs";
import getCC from "./routes/accounts/getCc.mjs";
import getElectricity from "./routes/accounts/getElectricity.mjs";
import getFD from "./routes/accounts/getFd.mjs";
import getLIC from "./routes/accounts/getLic.mjs";
import getMobile from "./routes/accounts/getMobile.mjs";
import getRent from "./routes/accounts/getRent.mjs";

// Customer KYC
import addCustomerKyc from "./routes/customer-kyc/addCustomerKyc.mjs";
import viewCompletedKyc from "./routes/customer-kyc/viewCompletedKyc.mjs";
import viewCustomerKycDetails from "./routes/customer-kyc/viewCustomerKycDetails.mjs";
import customerKycApproval from "./routes/customer-kyc/customerKycApproval.mjs";
import customerKycDraft from "./routes/customer-kyc/customerKycDraft.mjs";
import ViewCustomerKycDrafts from "./routes/customer-kyc/viewCustomerKycDrafts.mjs";
import hodApprovalPending from "./routes/customer-kyc/hodApprovalPending.mjs";
import approvedByHod from "./routes/customer-kyc/approvedByHod.mjs";
import viewRevisionList from "./routes/customer-kyc/viewRevisionList.mjs";

// Documentation
import updateDocumentationJob from "./routes/documentation/updateDocumentationJob.mjs";

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
import getJobDetail from "./routes/e-sanchit/getJobDetail.mjs";
import updateESanchitJob from "./routes/e-sanchit/updateESanchitJob.mjs";

// Home
import assignModules from "./routes/home/assignModules.mjs";
import assignRole from "./routes/home/assignRole.mjs";
import unassignModule from "./routes/home/unassignModules.mjs";
import changePassword from "./routes/home/changePassword.mjs";

// Import DO
import doTeamListOfjobs from "./routes/import-do/doTeamListOfjobs.mjs";
import getDoBilling from "./routes/import-do/getDoBilling.mjs";
import getDoModuleJobs from "./routes/import-do/getDoModuleJobs.mjs";
import updateDoBilling from "./routes/import-do/updateDoBilling.mjs";
import updateDoList from "./routes/import-do/updateDoList.mjs";
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

// Import Operations
import getOperationPlanningJobs from "./routes/import-operations/getOperationPlanningJobs.mjs";
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

// LR Report
import getPrData from "./routes/lr/getPrData.mjs";
import updatePr from "./routes/lr/updatePr.mjs";
import deletePr from "./routes/lr/deletePr.mjs";
import getOrganisations from "./routes/lr/getOrganisations.mjs";
import getLocations from "./routes/lr/getLocations.mjs";
import getContainerTypes from "./routes/lr/getContainerTypes.mjs";
import updateContainer from "./routes/lr/updateContainer.mjs";
import getTypeOfVehicles from "./routes/lr/getTypeOfVehicle.mjs";
import getVehicles from "./routes/lr/getVehicles.mjs";
import deleteTr from "./routes/lr/deleteTr.mjs";
import getTrs from "./routes/lr/getTrs.mjs";
import getOrganisationData from "./routes/lr/getOrganisationData.mjs";
import viewSrccDsr from "./routes/lr/viewSrccDsr.mjs";
import updateSrccDsr from "./routes/lr/updateSrccDsr.mjs";

// SRCC Directories
import addContainerType from "./routes/srcc-directories/addContainerType.mjs";
import addDriverDetails from "./routes/srcc-directories/addDriverDetails.mjs";
import addLocation from "./routes/srcc-directories/addLocation.mjs";
import addOrganisation from "./routes/srcc-directories/addOrganisation.mjs";
import addPlyRating from "./routes/srcc-directories/addPlyRating.mjs";
import addRepairType from "./routes/srcc-directories/addRepairType.mjs";
import addTypeOfVehicle from "./routes/srcc-directories/addTypeOfVehicle.mjs";
import addTyreBrand from "./routes/srcc-directories/addTyreBrand.mjs";
import addTyreModel from "./routes/srcc-directories/addTyreModel.mjs";
import addTyreSize from "./routes/srcc-directories/addTyreSize.mjs";
import addTyreType from "./routes/srcc-directories/addTyreType.mjs";
import addVehicle from "./routes/srcc-directories/addVehicle.mjs";
import addVendor from "./routes/srcc-directories/addVendor.mjs";
import getTyreBrand from "./routes/srcc-directories/getTyreBrand.mjs";
import getDriverDetails from "./routes/srcc-directories/getDriverDetails.mjs";
import getLocationMaster from "./routes/srcc-directories/getLocationMaster.mjs";
import getSrccOrganisations from "./routes/srcc-directories/getSrccOrganisations.mjs";
// sr_cel
import srCel from "./routes/srcc/sr_cel/srCel.mjs";

// Submission
import getSubmissionJobs from "./routes/submission/getSubmissionJobs.mjs";
import updateSubmissionJob from "./routes/submission/updateSubmissionJob.mjs";

// Tyre Maintenance
import getPlyRatings from "./routes/tyre-maintenance/getPlyRatings.mjs";
import getTyreBrands from "./routes/tyre-maintenance/getTyreBrands.mjs";
import getTyreModels from "./routes/tyre-maintenance/getTyreModels.mjs";
import getTyreSizes from "./routes/tyre-maintenance/getTyreSizes.mjs";
import getTyreTypes from "./routes/tyre-maintenance/getTyreTypes.mjs";
import getVendors from "./routes/tyre-maintenance/getVendors.mjs";
import addNewTyre from "./routes/tyre-maintenance/addNewTyre.mjs";
import getTyreNos from "./routes/tyre-maintenance/getTyreNos.mjs";
import addTyreFitting from "./routes/tyre-maintenance/addTyreFitting.mjs";
import addVehicleTyres from "./routes/tyre-maintenance/addVehicleTyres.mjs";
import addTyreBlast from "./routes/tyre-maintenance/addTyreBlast.mjs";
import getRepairTypes from "./routes/tyre-maintenance/getRepairTypes.mjs";
import addTyreRepairs from "./routes/tyre-maintenance/addTyreRepair.mjs";
import addTyreRetreading from "./routes/tyre-maintenance/addTyreRetreading.mjs";
import getDrivers from "./routes/tyre-maintenance/getDrivers.mjs";
import driverAssignment from "./routes/tyre-maintenance/driverAssignment.mjs";
import getTyreDetails from "./routes/tyre-maintenance/getTyreDetails.mjs";
import getTruckDetails from "./routes/tyre-maintenance/getTruckDetails.mjs";
import JobModel from "./model/jobModel.mjs";

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
    ? process.env.SERVER_MONGODB_URI
    : process.env.DEV_MONGODB_URI;

const numOfCPU = os.availableParallelism();
console.log(MONGODB_URI);
if (cluster.isPrimary) {
  for (let i = 0; i < numOfCPU; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log(`Starting a new worker`);
    cluster.fork();
  });
} else {
  const app = express();

  app.use(bodyParser.json({ limit: "100mb" }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());
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
      app.use(getAllUsers);
      app.use(getImporterList);
      app.use(getJobById);
      app.use(getUser);
      app.use(getUserData);
      app.use(getYears);
      app.use(login);

      // Accounts
      app.use(addAdani);
      app.use(addAMC);
      app.use(addCC);
      app.use(addElectricity);
      app.use(addFD);
      app.use(addLIC);
      app.use(addMobile);
      app.use(addRent);
      app.use(getAdani);
      app.use(getAMC);
      app.use(getCC);
      app.use(getElectricity);
      app.use(getFD);
      app.use(getLIC);
      app.use(getMobile);
      app.use(getRent);

      // Customer KYC
      app.use(addCustomerKyc);
      app.use(viewCompletedKyc);
      app.use(viewCustomerKycDetails);
      app.use(customerKycApproval);
      app.use(customerKycDraft);
      app.use(ViewCustomerKycDrafts);
      app.use(hodApprovalPending);
      app.use(approvedByHod);
      app.use(viewRevisionList);

      // Documentation
      app.use(updateDocumentationJob);

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
      app.use(getJobDetail);
      app.use(updateESanchitJob);

      // Home
      app.use(assignModules);
      app.use(assignRole);
      app.use(unassignModule);
      app.use(changePassword);

      // Import DO
      app.use(doTeamListOfjobs);
      app.use(getDoBilling);
      app.use(getDoModuleJobs);
      app.use(updateDoBilling);
      app.use(updateDoList);
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

      // Import Operations
      app.use(getOperationPlanningJobs);
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

      // Exit Feedback
      app.use(addExitInterview);
      app.use(ViewExitInterviews);

      // LR Report
      app.use(getPrData);
      app.use(updatePr);
      app.use(deletePr);
      app.use(getContainerTypes);
      app.use(getLocations);
      app.use(getOrganisations);
      app.use(updateContainer);
      app.use(getTypeOfVehicles);
      app.use(getVehicles);
      app.use(deleteTr);
      app.use(getTrs);
      app.use(getOrganisationData);
      app.use(viewSrccDsr);
      app.use(updateSrccDsr);

      // SRCC Directories
      app.use(addContainerType);
      app.use(addDriverDetails);
      app.use(addLocation);
      app.use(addOrganisation);
      app.use(addPlyRating);
      app.use(addRepairType);
      app.use(addTypeOfVehicle);
      app.use(addTyreBrand);
      app.use(addTyreModel);
      app.use(addTyreSize);
      app.use(addTyreType);
      app.use(addVendor);
      app.use(addVehicle);
      app.use(getTyreBrand);
      app.use(getVendors);
      app.use(getDriverDetails);
      app.use(getLocationMaster);
      app.use(getSrccOrganisations);
      // sr cel
      app.use(srCel);

      // Submission
      app.use(updateSubmissionJob);
      app.use(getSubmissionJobs);

      // Tyre Maintenance
      app.use(getPlyRatings);
      app.use(getTyreBrands);
      app.use(getTyreModels);
      app.use(getTyreSizes);
      app.use(getTyreTypes);
      app.use(getVendors);
      app.use(addNewTyre);
      app.use(getTyreNos);
      app.use(addTyreFitting);
      app.use(addVehicleTyres);
      app.use(addTyreBlast);
      app.use(getRepairTypes);
      app.use(addTyreRepairs);
      app.use(addTyreRetreading);
      app.use(getDrivers);
      app.use(driverAssignment);
      app.use(getTyreDetails);
      app.use(getTruckDetails);

      app.listen(9000, () => {
        console.log(`BE started at port 9000`);
      });
    })
    .catch((err) => console.log("Error connecting to MongoDB Atlas:", err));

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
