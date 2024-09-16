import React, { useState } from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import { Route, Routes } from "react-router-dom";
import { TabValueContext } from "../contexts/TabValueContext.js";
// Home
import Home from "../components/home/Home";
import Assign from "../components/home/Assign.js";
import ViewBugs from "../components/home/ViewBugs.js";
import ChangePassword from "../components/home/ChangePassword.js";
// Accounts
import Accounts from "../components/accounts/Accounts.js";
// Customer KYC
import CustomerKyc from "../components/customerKyc/CustomerKyc.js";
import ViewCustomerKyc from "../components/customerKyc/ViewCustomerKyc.js";
import ViewDraftDetails from "../components/customerKyc/ViewDraftDetails.js";
import ReviseCustomerKyc from "../components/customerKyc/ReviseCustomerKyc.js";
import ViewCompletedKycDetails from "../components/customerKyc/ViewCompletedKycDetails.js";
import EditCompletedKyc from "../components/customerKyc/EditCompletedKyc.js";
// Documentation
import Documentation from "../components/documentation/Documentation.js";
import Submission from "../components/submission/Submission.js";
// Employee KYC
import EmployeeKYC from "../components/employeeKyc/EmployeeKYC.js";
import ViewIndividualKyc from "../components/employeeKyc/ViewIndividualKyc.js";
// Employee Onboarding
import EmployeeOnboarding from "../components/employeeOnboarding/EmployeeOnboarding.js";
// E-Sanchit
import ESanchit from "../components/eSanchit/ESanchit.js";
import ViewESanchitJob from "../components/eSanchit/ViewESanchitJob.js";
// Exit Feedback
import ExitInterview from "../components/exit-interview/ExitInterview.js";
// Import DO
import ImportDO from "../components/import-do/ImportDO.js";
import EditDoList from "../components/import-do/EditDoList.js";
import EditDoPlanning from "../components/import-do/EditDoPlanning.js";
import EditBillingSheet from "../components/import-do/EditBillingSheet.js";
// Import DSR
import ImportDSR from "../components/import-dsr/ImportDSR.js";
import ViewJob from "../components/import-dsr/ViewJob.js";
// Import Operations
import ImportOperations from "../components/import-operations/ImportOperations.js";
import ViewOperationsJob from "../components/import-operations/ViewOperationsJob.js";
// Inward Register
import InwardRegister from "../components/inward-register/InwardRegister.js";
// Outward Register
import OutwardRegister from "../components/outward-register/OutwardRegister.js";
import OutwardRegisterDetails from "../components/outward-register/OutwardRegisterDetails.js";
import AppbarComponent from "../components/home/AppbarComponent.js";
import DrawerComponent from "../components/home/DrawerComponent.js";
// LR Report
import LrReport from "../components/lr-report/LrReport.js";
// SRCC Directories
import SrccDirectories from "../components/srcc-directories/SrccDirectories.js";
import ViewSrccOrganisationData from "../components/srcc-directories/view-data/ViewSrccOrganisationData.js";

// Tyre Maintenance
import TyreMaintenance from "../components/tyre-maintenance/TyreMaintenance.js";
// RTO
import RTO from "../components/rto/RTO.js";
import SRCEL from "../components/srcel/SRCEL.js";
import SRCELDashboard from "../components/srcel/SRCELDashboard.js";


const drawerWidth = 60;

function HomePage() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [tabValue, setTabValue] = useState(
    JSON.parse(localStorage.getItem("tab_value") || 0)
  );

  return (
    <TabValueContext.Provider value={{ tabValue, setTabValue }}>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppbarComponent
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <DrawerComponent
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: {
              lg: `calc(100% - ${drawerWidth}px)`,
              backgroundColor: "#F9FAFB",
              height: "100vh",
              overflow: "scroll",
              padding: "20px",
              paddingTop: 0,
            },
          }}
        >
          <Toolbar />
          <Routes>
            {/* Home */}
            <Route path="/" element={<Home />} />
            <Route path="/assign" element={<Assign />} />
            <Route path="/view-bugs" element={<ViewBugs />} />
            <Route path="/change-password" element={<ChangePassword />} />

            {/* Accounts */}
            <Route path="/accounts" element={<Accounts />} />

            {/* Customer KYC */}
            <Route path="/customer-kyc" element={<CustomerKyc />} />
            <Route
              path="/view-customer-kyc/:_id"
              element={<ViewCustomerKyc />}
            />
            <Route
              path="/view-customer-kyc-drafts/:_id"
              element={<ViewDraftDetails />}
            />
            <Route
              path="/revise-customer-kyc/:_id"
              element={<ReviseCustomerKyc />}
            />
            <Route
              path="/view-completed-kyc/:_id"
              element={<ViewCompletedKycDetails />}
            />
            <Route
              path="/edit-completed-kyc/:_id"
              element={<EditCompletedKyc />}
            />

            {/* Documentation */}
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/submission" element={<Submission />} />

            {/* Employee KYC */}
            <Route path="/employee-kyc" element={<EmployeeKYC />} />
            <Route path="/view-kyc/:username" element={<ViewIndividualKyc />} />

            {/* Employee Onboarding */}
            <Route
              path="/employee-onboarding"
              element={<EmployeeOnboarding />}
            />

            {/* ESanchit */}
            <Route path="/e-sanchit" element={<ESanchit />} />
            <Route
              path="/esanchit-job/:job_no/:year"
              element={<ViewESanchitJob />}
            />

            {/* Exit Feedback */}
            <Route path="/exit-feedback" element={<ExitInterview />} />

            {/* Export */}

            {/* Import DO */}
            <Route path="/import-do" element={<ImportDO />} />
            <Route path="/edit-do-list/:_id" element={<EditDoList />} />
            <Route path="/edit-do-planning/:_id" element={<EditDoPlanning />} />
            <Route
              path="/edit-billing-sheet/:_id"
              element={<EditBillingSheet />}
            />

            {/* Import DSR */}
            <Route path="/import-dsr" element={<ImportDSR />} />
            <Route path="/job/:job_no/:selected_year" element={<ViewJob />} />

            {/* Import Operations */}
            <Route path="/import-operations" element={<ImportOperations />} />
            <Route
              path="/import-operations/view-job/:job_no/:year"
              element={<ViewOperationsJob />}
            />

            {/* Inward Register */}
            <Route path="/inward-register" element={<InwardRegister />} />

            {/* Outward Register */}
            <Route path="/outward-register" element={<OutwardRegister />} />
            <Route
              path="/outward-register-details/:_id"
              element={<OutwardRegisterDetails />}
            />

            {/* LR Report */}
            <Route path="/lr-report" element={<LrReport />} />

            {/* SRCC Directories */}
            <Route path="/srcc-directories" element={<SrccDirectories />} />
            <Route
              path="/view-srcc-organisation-data/:_id"
              element={<ViewSrccOrganisationData />}
            />

            {/* Submission */}
            <Route path="/submission" element={<Submission />} />

            {/* Tyre Maintenance */}
            <Route path="/tyre-maintenance" element={<TyreMaintenance />} />
            <Route path="/srcel" element={<SRCEL />} />
            <Route path="/SRCEL-Dashboard" element={<SRCELDashboard />} />

            {/* RTO */}
            <Route path="/rto" element={<RTO />} />
          </Routes>
        </Box>
      </Box>
    </TabValueContext.Provider>
  );
}

export default HomePage;
