import React, { useState, lazy, Suspense } from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import { Route, Routes } from "react-router-dom";
import { TabValueContext } from "../contexts/TabValueContext.js";
import AppbarComponent from "../components/home/AppbarComponent.js";
import DrawerComponent from "../components/home/DrawerComponent.js";
import CircularProgress from "@mui/material/CircularProgress";

// Create a Loading component
const LoadingSpinner = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "80vh",
      width: "100%"
    }}
  >
    <CircularProgress />
  </Box>
);

// Lazy load all components
// Home
const Home = lazy(() => import("../components/home/Home"));
const Assign = lazy(() => import("../components/home/Assign.js"));
const ViewBugs = lazy(() => import("../components/home/ViewBugs.js"));
const ChangePassword = lazy(() => import("../components/home/ChangePassword.js"));

// Accounts
const Accounts = lazy(() => import("../components/accounts/Accounts.js"));

// Customer KYC
const CustomerKyc = lazy(() => import("../components/customerKyc/CustomerKyc.js"));
const ViewCustomerKyc = lazy(() => import("../components/customerKyc/ViewCustomerKyc.js"));
const ViewDraftDetails = lazy(() => import("../components/customerKyc/ViewDraftDetails.js"));
const ReviseCustomerKyc = lazy(() => import("../components/customerKyc/ReviseCustomerKyc.js"));
const ViewCompletedKycDetails = lazy(() => import("../components/customerKyc/ViewCompletedKycDetails.js"));
const EditCompletedKyc = lazy(() => import("../components/customerKyc/EditCompletedKyc.js"));

// Documentation
const DocumentationTab = lazy(() => import("../components/documentation/DocumentationTab.js"));
const DocumentationJob = lazy(() => import("../components/documentation/DocumentationJob.js"));

// Submission
const Submission = lazy(() => import("../components/submission/Submission.js"));
const SubmissionJob = lazy(() => import("../components/submission/SubmissionJob.js"));

// Employee KYC
const EmployeeKYC = lazy(() => import("../components/employeeKyc/EmployeeKYC.js"));
const ViewIndividualKyc = lazy(() => import("../components/employeeKyc/ViewIndividualKyc.js"));

// Employee Onboarding
const EmployeeOnboarding = lazy(() => import("../components/employeeOnboarding/EmployeeOnboarding.js"));

// E-Sanchit
const ESanchitTab = lazy(() => import("../components/eSanchit/ESanchitTab.js"));
const ViewESanchitJob = lazy(() => import("../components/eSanchit/ViewESanchitJob.js"));

// Exit Feedback
const ExitInterview = lazy(() => import("../components/exit-interview/ExitInterview.js"));

// Import DO
const ImportDO = lazy(() => import("../components/import-do/ImportDO.js"));
const EditDoList = lazy(() => import("../components/import-do/EditDoList.js"));
const EditDoPlanning = lazy(() => import("../components/import-do/EditDoPlanning.js"));
const EditDoCompleted = lazy(() => import("../components/import-do/EditDoCompleted.js"));
const EditBillingSheet = lazy(() => import("../components/import-do/EditBillingSheet.js"));

// Import DSR
const ImportDSR = lazy(() => import("../components/import-dsr/ImportDSR.js"));
const ViewJob = lazy(() => import("../components/import-dsr/ViewJob.js"));

// Import Operations
const ImportOperations = lazy(() => import("../components/import-operations/ImportOperations.js"));
const ViewOperationsJob = lazy(() => import("../components/import-operations/ViewOperationsJob.js"));
const OperationListJob = lazy(() => import("../components/import-operations/OperationListJob.js"));

// Import add
const ImportersInfo = lazy(() => import("../components/home/ImportersInfo/ImportersInfo.js"));

// import billing 
const ImportBilling = lazy(() => import("../components/Import-billing/ImportBilling.js"));
const ViewBillingJob = lazy(() => import("../components/Import-billing/ViewBillingJob.js"));

// Inward Register
const InwardRegister = lazy(() => import("../components/inward-register/InwardRegister.js"));

// Outward Register
const OutwardRegister = lazy(() => import("../components/outward-register/OutwardRegister.js"));
const OutwardRegisterDetails = lazy(() => import("../components/outward-register/OutwardRegisterDetails.js"));

// LR Operations
const LrReport = lazy(() => import("../components/lr-report/LrReport.js"));

// SRCC Directories
const SrccDirectories = lazy(() => import("../components/srcc-directories/SrccDirectories.js"));
const ViewSrccOrganisationData = lazy(() => import("../components/srcc-directories/view-data/ViewSrccOrganisationData.js"));

// Tyre Maintenance
const TyreMaintenance = lazy(() => import("../components/tyre-maintenance/TyreMaintenance.js"));

// RTO
const RTO = lazy(() => import("../components/rto/RTO.js"));
const SRCEL = lazy(() => import("../components/srcel/SRCEL.js"));
const SRCELDashboard = lazy(() => import("../components/srcel/SRCELDashboard.js"));

// Screens
const Screen1 = lazy(() => import("../components/Screens/Screen1.js"));
const Screen2 = lazy(() => import("../components/Screens/Screen2.js"));
const Screen3 = lazy(() => import("../components/Screens/Screen3.js"));
const Screen4 = lazy(() => import("../components/Screens/Screen4.js"));
const Screen5 = lazy(() => import("../components/Screens/Screen5.js"));
const Screen6 = lazy(() => import("../components/Screens/Screen6.js"));

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
          <Suspense fallback={<LoadingSpinner />}>
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
              <Route path="documentation" element={<DocumentationTab />} />
              <Route
                path="/documentationJob/view-job/:job_no/:year"
                element={<DocumentationJob />}
              />

              {/* Submission */}
              <Route path="/submission" element={<Submission />} />
              <Route
                path="/submission-job/:job_no/:year"
                element={<SubmissionJob />}
              />

              {/* Employee KYC */}
              <Route path="/employee-kyc" element={<EmployeeKYC />} />
              <Route path="/view-kyc/:username" element={<ViewIndividualKyc />} />

              {/* Employee Onboarding */}
              <Route
                path="/employee-onboarding"
                element={<EmployeeOnboarding />}
              />

              {/* ESanchit */}
              <Route path="/e-sanchit" element={<ESanchitTab />} />
              <Route
                path="/esanchit-job/:job_no/:year"
                element={<ViewESanchitJob />}
              />

              {/* Exit Feedback */}
              <Route path="/exit-feedback" element={<ExitInterview />} />

              {/* Import DO */}
              <Route path="/import-do" element={<ImportDO />} />
              <Route path="/edit-do-list/:_id" element={<EditDoList />} />
              <Route path="/edit-do-planning/:_id" element={<EditDoPlanning />} />
              <Route path="edit-do-completed/:_id" element={<EditDoCompleted />} />
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
              <Route
                path="/import-operations/list-operation-job/:job_no/:year"
                element={<OperationListJob />}
              />
              
              {/* ImportersInfo */}
              <Route path="/ImportersInfo" element={<ImportersInfo />} />

              {/* import billing */}
              <Route path="/import-billing" element={<ImportBilling />} />
              <Route path="/view-billing-job/:job_no/:year" element={<ViewBillingJob />} />
              
              {/* Inward Register */}
              <Route path="/inward-register" element={<InwardRegister />} />

              {/* Outward Register */}
              <Route path="/outward-register" element={<OutwardRegister />} />
              <Route
                path="/outward-register-details/:_id"
                element={<OutwardRegisterDetails />}
              />

              {/* LR Operations */}
              <Route path="/lr-report" element={<LrReport />} />
              
              {/* Screens */}
              <Route path="/screen1" element={<Screen1 />} />
              <Route path="/screen2" element={<Screen2 />} />
              <Route path="/screen3" element={<Screen3 />} />
              <Route path="/screen4" element={<Screen4 />} />
              <Route path="/screen5" element={<Screen5 />} />
              <Route path="/screen6" element={<Screen6 />} />

              {/* SRCC Directories */}
              <Route path="/srcc-directories" element={<SrccDirectories />} />
              <Route
                path="/view-srcc-organisation-data/:_id"
                element={<ViewSrccOrganisationData />}
              />

              {/* Tyre Maintenance */}
              <Route path="/tyre-maintenance" element={<TyreMaintenance />} />
              <Route path="/srcel" element={<SRCEL />} />
              <Route path="/SRCEL-Dashboard" element={<SRCELDashboard />} />

              {/* RTO */}
              <Route path="/rto" element={<RTO />} />
            </Routes>
          </Suspense>
        </Box>
      </Box>
    </TabValueContext.Provider>
  );
}

export default HomePage;