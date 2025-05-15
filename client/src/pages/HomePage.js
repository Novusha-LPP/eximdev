import React, { useState, useContext, useEffect } from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import { Route, Routes, useNavigate } from "react-router-dom";
import { TabValueContext } from "../contexts/TabValueContext.js";
import { UserContext } from "../contexts/UserContext.js";
// Home
import Home from "../components/home/Home";
import Assign from "../components/home/Assign.js";
import ViewBugs from "../components/home/ViewBugs.js";
import ChangePassword from "../components/home/ChangePassword.js";
// Accounts
import Accounts from "../components/accounts/Accounts.js";

// import billing
import ImportBilling from "../components/Import-billing/ImportBilling.js";
import ViewBillingJob from "../components/Import-billing/ViewBillingJob.js";

// Customer KYC
import CustomerKyc from "../components/customerKyc/CustomerKyc.js";
import ViewCustomerKyc from "../components/customerKyc/ViewCustomerKyc.js";
import ViewDraftDetails from "../components/customerKyc/ViewDraftDetails.js";
import ReviseCustomerKyc from "../components/customerKyc/ReviseCustomerKyc.js";
import ViewCompletedKycDetails from "../components/customerKyc/ViewCompletedKycDetails.js";
import EditCompletedKyc from "../components/customerKyc/EditCompletedKyc.js";
// Documentation
import Documentation from "../components/documentation/Documentation.js";
import DocumentationJob from "../components/documentation/DocumentationJob.js";
// Submission
import Submission from "../components/submission/Submission.js";
import SubmissionJob from "../components/submission/SubmissionJob.js";
// Employee KYC
import EmployeeKYC from "../components/employeeKyc/EmployeeKYC.js";
import ViewIndividualKyc from "../components/employeeKyc/ViewIndividualKyc.js";
// Employee Onboarding
import EmployeeOnboarding from "../components/employeeOnboarding/EmployeeOnboarding.js";
// E-Sanchit
import ESanchit from "../components/eSanchit/ESanchit.js";
import ESanchitTab from "../components/eSanchit/ESanchitTab.js";

import ViewESanchitJob from "../components/eSanchit/ViewESanchitJob.js";
// Exit Feedback
import ExitInterview from "../components/exit-interview/ExitInterview.js";
// Import DO
import ImportDO from "../components/import-do/ImportDO.js";
import EditDoList from "../components/import-do/EditDoList.js";
import EditDoPlanning from "../components/import-do/EditDoPlanning.js";
import EditDoCompleted from "../components/import-do/EditDoCompleted.js";
import EditBillingSheet from "../components/import-do/EditBillingSheet.js";
// Import DSR
import ImportDSR from "../components/import-dsr/ImportDSR.js";
import ViewJob from "../components/import-dsr/ViewJob.js";
// Import Operations
import ImportOperations from "../components/import-operations/ImportOperations.js";
import DocumentationTab from "../components/documentation/DocumentationTab.js";
import ViewOperationsJob from "../components/import-operations/ViewOperationsJob.js";
import OperationListJob from "../components/import-operations/OperationListJob.js";

// Import add
import ImportersInfo from "../components/home/ImportersInfo/ImportersInfo.js";

// Import Utility Tool
import ImportUtilityTool from "../components/import-utility-tool/ImportUtilityTool.js";

// Inward Register
import InwardRegister from "../components/inward-register/InwardRegister.js";
// Outward Register
import OutwardRegister from "../components/outward-register/OutwardRegister.js";
import OutwardRegisterDetails from "../components/outward-register/OutwardRegisterDetails.js";
import AppbarComponent from "../components/home/AppbarComponent.js";
import DrawerComponent from "../components/home/DrawerComponent.js";
// LR Operations
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

// Screens
import Screen1 from "../components/Screens/Screen1.js";
import Screen2 from "../components/Screens/Screen2.js";
import Screen3 from "../components/Screens/Screen3.js";
import Screen4 from "../components/Screens/Screen4.js";
import Screen5 from "../components/Screens/Screen5.js";
import Screen6 from "../components/Screens/Screen6.js";
import CImportDSR from "../components/customer/CImportDSR.js";
import CViewJob from "../components/customer/CViewJob.js";
import UtilityParent from "../components/import-utility-tool/UtilityParent.js";
import DutyCalculator from "../components/import-utility-tool/duty-calculator/DutyCalculator.js";

const drawerWidth = 60;

function HomePage() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login"); // Redirect to login if user is not authenticated
    }
  }, [user, navigate]);

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

            {/* import billing */}
            <Route path="/import-billing" element={<ImportBilling />} />
            <Route
              path="/view-billing-job/:job_no/:year"
              element={<ViewBillingJob />}
            />

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

            {/* Export */}

            {/* Import DO */}
            <Route path="/import-do" element={<ImportDO />} />
            <Route path="/edit-do-list/:_id" element={<EditDoList />} />
            <Route path="/edit-do-planning/:_id" element={<EditDoPlanning />} />
            <Route
              path="edit-do-completed/:_id"
              element={<EditDoCompleted />}
            />
            <Route
              path="/edit-billing-sheet/:_id"
              element={<EditBillingSheet />}
            />

            {/* Import DSR */}
            <Route path="/import-dsr" element={<ImportDSR />} />
            <Route path="/job/:job_no/:selected_year" element={<ViewJob />} />

            {/* Customer DSR  */}
            <Route path="/customer" element={<CImportDSR />} />
            <Route path="/cjob/:job_no/:selected_year" element={<CViewJob />} />

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
            {/* import utility tool */}

            <Route
              path="/import-utility-tool"
              element={<ImportUtilityTool />}
            />
            <Route path="/duty-calculator" element={<DutyCalculator />} />
            <Route path="/utilities" element={<UtilityParent />} />
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
        </Box>
      </Box>
    </TabValueContext.Provider>
  );
}

export default HomePage;
