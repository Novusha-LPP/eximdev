import React, { useState } from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import { Route, Routes, Navigate } from "react-router-dom";
import { TabValueContext } from "../contexts/TabValueContext.js";
import { SearchQueryProvider } from "../contexts/SearchQueryContext.js";
import ProtectedRoute from "./ProtectedRoute.js";
// Home
import Home from "../components/home/Home";
import Assign from "../components/home/Assign.js";
import ChangePassword from "../components/home/ChangePassword.js";
// Accounts
import Accounts from "../components/accounts/Accounts.js";
// Documentation
import DocumentationJob from "../components/documentation/DocumentationJob.js";
// Submission
import SubmissionTabs from "../components/submission/SubmissionTabs.js";
import SubmissionJob from "../components/submission/SubmissionJob.js";
// Employee KYC
import EmployeeKYC from "../components/employeeKyc/EmployeeKYC.js";
import ViewIndividualKyc from "../components/employeeKyc/ViewIndividualKyc.js";
// Employee Onboarding
import EmployeeOnboarding from "../components/employeeOnboarding/EmployeeOnboarding.js";
// E-Sanchit
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
import LogsPage from "../components/import-dsr/LogsPage.js";
// Import Operations
import ImportOperations from "../components/import-operations/ImportOperations.js";
import DocumentationTab from "../components/documentation/DocumentationTab.js";
import ViewOperationsJob from "../components/import-operations/ViewOperationsJob.js";
import OperationListJob from "../components/import-operations/OperationListJob.js";

// Import add
import ImportersInfo from "../components/home/ImportersInfo/ImportersInfo.js";

// Import Utility Tool
import ImportUtilityTool from "../components/import-utility-tool/ImportUtilityTool.js";

//import Report 
import ReportTabs from "../components/Report/ReportTabs.js";
import MonthlyContainers from "../components/Report/monthlyContainers.js";
import DetailedReport from "../components/Report/DetailedReport.js";

// import auditrail
import AuditTrailViewer from "../components/audit/AuditTrailViewer.js";
// import billing 
import ViewBillingJob from "../components/Import-billing/ViewBillingJob.js";

import EditPaymentRequest from "../components/Import-billing/EditPaymentRequest.js";
// Inward Register
import InwardRegister from "../components/inward-register/InwardRegister.js";
// Outward Register
import OutwardRegister from "../components/outward-register/OutwardRegister.js";
import OutwardRegisterDetails from "../components/outward-register/OutwardRegisterDetails.js";
import AppbarComponent from "../components/home/AppbarComponent.js";
import DrawerComponent from "../components/home/DrawerComponent.js";
import ReleaseNotes from "../components/home/ReleaseNotes.js";
import Feedback from "../components/home/Feedback.js";

// Screens
import Screen1 from "../components/Screens/Screen1.js";
import Screen2 from "../components/Screens/Screen2.js";
import Screen3 from "../components/Screens/Screen3.js";
import Screen4 from "../components/Screens/Screen4.js";
import Screen5 from "../components/Screens/Screen5.js";
import Screen6 from "../components/Screens/Screen6.js";
import UtilityParent from "../components/import-utility-tool/UtilityParent.js";
import DutyCalculator from "../components/import-utility-tool/duty-calculator/DutyCalculator.js";
import ImportBillingTab from "../components/Import-billing/ImportBillingTab.js";
import AllUsersPage from "./AllUsersPage.js";


// Analytics
import AnalyticsLayout from "../components/analytics/AnalyticsLayout";
import { AnalyticsProvider } from "../components/analytics/AnalyticsContext";
import OverviewDashboard from "../components/analytics/OverviewDashboard";
import MovementDashboard from "../components/analytics/MovementDashboard";
import CustomsDashboard from "../components/analytics/CustomsDashboard";
import DocumentationDashboard from "../components/analytics/DocumentationDashboard";
import DoManagementDashboard from "../components/analytics/DoManagementDashboard";
import BillingDashboard from "../components/analytics/BillingDashboard";
import ExceptionsDashboard from "../components/analytics/ExceptionsDashboard";
import ESanchitDashboard from "../components/analytics/ESanchitDashboard";
import OperationsDashboard from "../components/analytics/OperationsDashboard";
import SubmissionDashboard from "../components/analytics/SubmissionDashboard";


const drawerWidth = 60;


function HomePage() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [tabValue, setTabValue] = useState(
    JSON.parse(localStorage.getItem("tab_value") || 0)
  );

  return (
    <TabValueContext.Provider value={{ tabValue, setTabValue }}>
      <SearchQueryProvider>
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
              {/* Public Routes - No protection needed */}
              <Route path="/" element={<Home />} />
              <Route path="/change-password" element={<ChangePassword />} />

              {/* Protected Routes */}
              <Route
                path="/assign"
                element={

                  <Assign />
                }
              />

              {/* Accounts */}
              <Route
                path="/accounts"
                element={
                  <ProtectedRoute requiredModule="Accounts">
                    <Accounts />
                  </ProtectedRoute>
                }
              />

              {/* Documentation */}
              <Route
                path="/documentation"
                element={
                  <ProtectedRoute requiredModule="Documentation">
                    <DocumentationTab />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documentationJob/view-job/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="Documentation">
                    <DocumentationJob />
                  </ProtectedRoute>
                }
              />

              {/* Submission */}
              <Route
                path="/submission"
                element={
                  <ProtectedRoute requiredModule="Submission">
                    <SubmissionTabs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submission-job/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="Submission">
                    <SubmissionJob />
                  </ProtectedRoute>
                }
              />

              {/* Employee KYC */}
              <Route
                path="/employee-kyc"
                element={
                  <ProtectedRoute requiredModule="Employee KYC">
                    <EmployeeKYC />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/view-kyc/:username"
                element={
                  <ProtectedRoute requiredModule="Employee KYC">
                    <ViewIndividualKyc />
                  </ProtectedRoute>
                }
              />

              {/* Employee Onboarding */}
              <Route
                path="/employee-onboarding"
                element={
                  <ProtectedRoute requiredModule="Employee Onboarding">
                    <EmployeeOnboarding />
                  </ProtectedRoute>
                }
              />

              {/* ESanchit */}
              <Route
                path="/e-sanchit"
                element={
                  <ProtectedRoute requiredModule="e-Sanchit">
                    <ESanchitTab />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/esanchit-job/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="e-Sanchit">
                    <ViewESanchitJob />
                  </ProtectedRoute>
                }
              />

              {/* Exit Feedback */}
              <Route
                path="/exit-feedback"
                element={
                  <ProtectedRoute requiredModule="Exit Feedback">
                    <ExitInterview />
                  </ProtectedRoute>
                }
              />

              {/* Import DO */}
              <Route
                path="/import-do"
                element={
                  <ProtectedRoute requiredModule="Import - DO">
                    <ImportDO />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-do-list/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="Import - DO">
                    <EditDoList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-do-planning/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="Import - DO">
                    <EditDoPlanning />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-do-completed/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="Import - DO">
                    <EditDoCompleted />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-billing-sheet/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="Import - DO">
                    <EditBillingSheet />
                  </ProtectedRoute>
                }
              />

              {/* Import DSR */}
              <Route
                path="/import-dsr"
                element={
                  <ProtectedRoute requiredModule="Import - DSR">
                    <ImportDSR />
                  </ProtectedRoute>
                }
              />
              {/* Import DSR */}
              <Route
                path="/logs"
                element={
                  <ProtectedRoute requiredModule="Import - DSR">
                    <LogsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/import-dsr/job/:job_no/:selected_year"
                element={
                  <ProtectedRoute requiredModule="Import - DSR">
                    <ViewJob />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/job/:job_no/:selected_year"
                element={
                  <ProtectedRoute requiredModule="Import - DSR">
                    <ViewJob />
                  </ProtectedRoute>
                }
              />

              {/* Import Operations */}
              <Route
                path="/import-operations"
                element={
                  <ProtectedRoute requiredModule="Import - Operations">
                    <ImportOperations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/import-operations/view-job/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="Import - Operations">
                    <ViewOperationsJob />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/import-operations/list-operation-job/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="Import - Operations">
                    <OperationListJob />
                  </ProtectedRoute>
                }
              />

              {/* ImportersInfo */}
              <Route
                path="/ImportersInfo"
                element={
                  <ProtectedRoute requiredModule="Import - Add">
                    <ImportersInfo />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/import-utility-tool"
                element={
                  <ProtectedRoute requiredModule="Import Utility Tool">
                    <ImportUtilityTool />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/report"
                element={
                  <ProtectedRoute requiredModule="Report">
                    <ReportTabs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/report/monthly-containers"
                element={
                  <ProtectedRoute requiredModule="Report">
                    <MonthlyContainers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/report/detailed"
                element={
                  <ProtectedRoute requiredModule="Report">
                    <DetailedReport />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/audit-trail"
                element={
                  <ProtectedRoute requiredModule="Audit Trail">
                    <AuditTrailViewer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/all-users"
                element={
                  <ProtectedRoute requiredModule="Audit Trail">
                    <AllUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/duty-calculator"
                element={
                  <ProtectedRoute requiredModule="Import Utility Tool">
                    <DutyCalculator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/utilities"
                element={
                  <ProtectedRoute requiredModule="Import Utility Tool">
                    <UtilityParent />
                  </ProtectedRoute>
                }
              />

              {/* import billing */}
              <Route
                path="/import-billing"
                element={
                  <ProtectedRoute requiredModule="Import - Billing">
                    <ImportBillingTab />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/view-billing-job/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="Import - Billing">
                    <ViewBillingJob />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/view-payment-request-job/:job_no/:year"
                element={
                  <ProtectedRoute requiredModule="Import - Billing">
                    <EditPaymentRequest />
                  </ProtectedRoute>
                }
              />

              {/* Screens */}
              <Route
                path="/screen1"
                element={
                  <ProtectedRoute requiredModule="Screen1">
                    <Screen1 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screen2"
                element={
                  <ProtectedRoute requiredModule="Screen2">
                    <Screen2 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screen3"
                element={
                  <ProtectedRoute requiredModule="Screen3">
                    <Screen3 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screen4"
                element={
                  <ProtectedRoute requiredModule="Screen4">
                    <Screen4 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screen5"
                element={
                  <ProtectedRoute requiredModule="Screen5">
                    <Screen5 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/screen6"
                element={
                  <ProtectedRoute requiredModule="Screen6">
                    <Screen6 />
                  </ProtectedRoute>
                }
              />

              {/* Inward Register */}
              <Route
                path="/inward-register"
                element={
                  <ProtectedRoute requiredModule="Inward Register">
                    <InwardRegister />
                  </ProtectedRoute>
                }
              />

              {/* Outward Register */}
              <Route
                path="/outward-register"
                element={
                  <ProtectedRoute requiredModule="Outward Register">
                    <OutwardRegister />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/outward-register-details/:_id"
                element={
                  <ProtectedRoute requiredModule="Outward Register">
                    <OutwardRegisterDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/release-notes"
                element={
                  <ReleaseNotes />
                }
              />
              <Route
                path="/feedback"
                element={
                  <Feedback />
                }
              />

              {/* Analytics */}
              <Route path="/analytics" element={
                <ProtectedRoute requiredModule="Report">
                  <AnalyticsProvider>
                    <AnalyticsLayout />
                  </AnalyticsProvider>
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<OverviewDashboard />} />
                <Route path="movement" element={<MovementDashboard />} />
                <Route path="customs" element={<CustomsDashboard />} />
                <Route path="documentation" element={<DocumentationDashboard />} />
                <Route path="submission" element={<SubmissionDashboard />} />
                <Route path="esanchit" element={<ESanchitDashboard />} />
                <Route path="operations" element={<OperationsDashboard />} />
                <Route path="do-management" element={<DoManagementDashboard />} />
                <Route path="billing" element={<BillingDashboard />} />
                <Route path="exceptions" element={<ExceptionsDashboard />} />
              </Route>

            </Routes>
          </Box>
        </Box>
      </SearchQueryProvider>
    </TabValueContext.Provider>
  );
}

export default HomePage;
