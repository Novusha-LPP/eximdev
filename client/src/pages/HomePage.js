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
import UserProfile from "../components/userProfile/UserProfile.js";
import BranchManagement from "../components/admin/BranchManagement.js";
import ApiKeyManagement from "../components/admin/ApiKeyManagement.js";

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
import UpdateEmployeeData from "../components/hr/UpdateEmployeeData.js";

// Customer KYC
import CustomerKyc from "../components/customerKyc/CustomerKyc.js";
import ReviseCustomerKyc from "../components/customerKyc/ReviseCustomerKyc.js";
import ViewDraftDetails from "../components/customerKyc/ViewDraftDetails.js";
import ViewCustomerKyc from "../components/customerKyc/ViewCustomerKyc.js";
import ViewCompletedKycDetails from "../components/customerKyc/ViewCompletedKycDetails.js";
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
import EditFreeDaysConf from "../components/import-do/EditFreeDaysConf.js";
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

// Master Directory
import MasterDirectory from "../components/master-directory/MasterDirectory.js";
import CountryDirectory from "../components/master-directory/CountryDirectory.js";
import AirlinesDirectory from "../components/master-directory/AirlinesDirectory.js";
import UnitDirectory from "../components/master-directory/UnitDirectory.js";
import OrganizationDirectory from "../components/master-directory/OrganizationDirectory.js";
import OrganizationForm from "../components/master-directory/OrganizationForm.js";



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
// import ExceptionsDashboard from "../components/analytics/ExceptionsDashboard";
import ESanchitDashboard from "../components/analytics/ESanchitDashboard";
import OperationsDashboard from "../components/analytics/OperationsDashboard";
import SubmissionDashboard from "../components/analytics/SubmissionDashboard";
import CombinedDashboard from "../components/analytics/CombinedDashboard";

// Open Points

import OpenPointsHome from "../components/open-points/OpenPointsHome.js";
import ProjectWorkspace from "../components/open-points/ProjectWorkspace.js";
import AnalyticsDashboard from "../components/open-points/AnalyticsDashboard.js";
import MyOpenPoints from "../components/open-points/MyOpenPoints.js";

// Project Nucleus
import NucleusHome from "../components/project-nucleus/NucleusHome.js";

// KPI Module
import KPIHome from "../components/kpi/KPIHome.js";
import KPISheet from "../components/kpi/KPISheet.js";
import KPITemplateManager from "../components/kpi/KPITemplateManager.js";
import KPIAdminDashboard from "../components/kpi/KPIAdminDashboard.js";
import KPIReviewerDashboard from "../components/kpi/KPIReviewerDashboard.js";
import KPIPulseDashboard from "../components/kpi/KPIPulseDashboard.js";
import MRMHome from "../components/mrm/MRMHome.js";
import MRMAdminDashboard from "../components/mrm/MRMAdminDashboard.js";

// Branch Context
import { BranchProvider } from "../contexts/BranchContext.js";

// HOD Management
import HodManagement from "../components/home/HodManagement.js";

// DGFT Module
import DgftTabs from "../components/dgft/DgftTabs.js";
import ViewAuthorizationDetails from "../components/dgft/ViewAuthorizationDetails.js";

import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import { useBranch } from "../contexts/BranchContext.js";

const drawerWidth = 60;

function HomePageContent() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [tabValue, setTabValue] = useState(
    JSON.parse(localStorage.getItem("tab_value") || 0)
  );
  
  const { isChangingBranch } = useBranch();

  if (isChangingBranch) {
    return (
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(249, 250, 251, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(8px)'
      }}>
        <CircularProgress size={60} thickness={4} sx={{ color: '#1a237e', mb: 2 }} />
        <Typography variant="h5" sx={{ color: '#1a237e', fontWeight: 600, letterSpacing: '0.5px' }}>
          Switching Branch...
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
          Please wait while we prepare your workspace
        </Typography>
      </Box>
    );
  }

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
              {/* ... routes ... */}
                {/* Public Routes - No protection needed */}
                <Route path="/" element={<Home />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/profile/:username" element={<UserProfile />} />

                {/* Protected Routes */}
                <Route path="/assign" element={<Assign />} />
                <Route path="/admin/branches" element={<BranchManagement />} />
                <Route path="/admin/api-keys" element={<ApiKeyManagement />} />


                {/* HOD Management - For Head of Department users */}
                <Route path="/hod-management" element={<HodManagement />} />

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
                  path="/documentationJob/view-job/:branch_code/:trade_type/:mode/:job_no/:year"
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
                  path="/submission-job/:branch_code/:trade_type/:mode/:job_no/:year"
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
                  path="/complete-kyc/:username"
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

                {/* Customer KYC */}
                <Route
                  path="/customer-kyc"
                  element={
                    <ProtectedRoute requiredModule="Customer KYC">
                      <CustomerKyc />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/revise-customer-kyc/:_id"
                  element={
                    <ProtectedRoute requiredModule="Customer KYC">
                      <ReviseCustomerKyc />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/view-draft-details/:_id"
                  element={
                    <ProtectedRoute requiredModule="Customer KYC">
                      <ViewDraftDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/view-customer-kyc/:_id"
                  element={
                    <ProtectedRoute requiredModule="Customer KYC">
                      <ViewCustomerKyc />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/view-completed-kyc/:_id"
                  element={
                    <ProtectedRoute requiredModule="Customer KYC">
                      <ViewCompletedKycDetails />
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
                <Route
                  path="/update-employee-data"
                  element={
                    <ProtectedRoute requiredModule="Update Employee Data">
                      <UpdateEmployeeData />
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
                  path="/esanchit-job/:branch_code/:trade_type/:mode/:job_no/:year"
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
                  path="/edit-do-list/:branch_code/:trade_type/:mode/:job_no/:year"
                  element={
                    <ProtectedRoute requiredModule="Import - DO">
                      <EditDoList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/edit-do-planning/:branch_code/:trade_type/:mode/:job_no/:year"
                  element={
                    <ProtectedRoute requiredModule="Import - DO">
                      <EditDoPlanning />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/edit-do-completed/:branch_code/:trade_type/:mode/:job_no/:year"
                  element={
                    <ProtectedRoute requiredModule="Import - DO">
                      <EditDoCompleted />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/edit-billing-sheet/:branch_code/:trade_type/:mode/:job_no/:year"
                  element={
                    <ProtectedRoute requiredModule="Import - DO">
                      <EditBillingSheet />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/edit-free-days-conf/:branch_code/:trade_type/:mode/:job_no/:year"
                  element={
                    <ProtectedRoute requiredModule="Import - DO">
                      <EditFreeDaysConf />
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
                  path="/import-dsr/job/:branch_code/:trade_type/:mode/:job_no/:selected_year"
                  element={
                    <ProtectedRoute requiredModule="Import - DSR">
                      <ViewJob />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/job/:branch_code/:trade_type/:mode/:job_no/:selected_year"
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
                  path="/import-operations/view-job/:branch_code/:trade_type/:mode/:job_no/:year"
                  element={
                    <ProtectedRoute requiredModule="Import - Operations">
                      <ViewOperationsJob />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/import-operations/list-operation-job/:branch_code/:trade_type/:mode/:job_no/:year"
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
                  path="/master-directory"
                  element={
                    <ProtectedRoute requiredModule="MasterDirectory">
                      <MasterDirectory />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/country-directory"
                  element={
                    <ProtectedRoute requiredModule="MasterDirectory">
                      <CountryDirectory />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/airlines-directory"
                  element={
                    <ProtectedRoute requiredModule="MasterDirectory">
                      <AirlinesDirectory />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/unit-directory"
                  element={
                    <ProtectedRoute requiredModule="MasterDirectory">
                      <UnitDirectory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organization-directory"
                  element={
                    <ProtectedRoute requiredModule="MasterDirectory">
                      <OrganizationDirectory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/add-organization"
                  element={
                    <ProtectedRoute requiredModule="MasterDirectory">
                      <OrganizationForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/edit-organization/:id"
                  element={
                    <ProtectedRoute requiredModule="MasterDirectory">
                      <OrganizationForm />
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
                  path="/view-billing-job/:branch_code/:trade_type/:mode/:job_no/:year"
                  element={
                    <ProtectedRoute requiredModule="Import - Billing">
                      <ViewBillingJob />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/view-payment-request-job/:branch_code/:trade_type/:mode/:job_no/:year"
                  element={
                    <ProtectedRoute requiredModule="Import - Billing">
                      <EditPaymentRequest />
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

                <Route path="/release-notes" element={<ReleaseNotes />} />
                <Route path="/feedback" element={<Feedback />} />

                {/* Pulse */}

                <Route
                  path="/pulse"
                  element={
                    <ProtectedRoute requiredModule="Pulse">
                      <AnalyticsProvider>
                        <AnalyticsLayout />
                      </AnalyticsProvider>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="combined" replace />} />
                  <Route path="combined" element={<CombinedDashboard />} />
                  <Route path="esanchit" element={<ESanchitDashboard />} />
                  <Route
                    path="documentation"
                    element={<DocumentationDashboard />}
                  />
                  <Route path="submission" element={<SubmissionDashboard />} />
                  <Route path="operations" element={<OperationsDashboard />} />
                  <Route
                    path="do-management"
                    element={<DoManagementDashboard />}
                  />
                </Route>

                {/* MRM Module */}
                <Route
                  path="/mrm"
                  element={
                    <ProtectedRoute requiredModule="MRM">
                      <MRMHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mrm/admin"
                  element={
                    <ProtectedRoute requiredModule="MRM">
                      <MRMAdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Open Points - New Module */}
                <Route path="/open-points" element={<OpenPointsHome />} />

                <Route
                  path="/open-points/analytics"
                  element={<AnalyticsDashboard />}
                />
                <Route
                  path="/open-points/project/:projectId"
                  element={<ProjectWorkspace />}
                />
                <Route
                  path="/open-points/my-points"
                  element={<MyOpenPoints />}
                />
                <Route
                  path="/open-points/user/:username"
                  element={<MyOpenPoints />}
                />

                {/* KPI Module */}
                <Route
                  path="/kpi"
                  element={
                    <ProtectedRoute requiredModule="KPI">
                      <KPIHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kpi/sheet/:sheetId"
                  element={
                    <ProtectedRoute requiredModule="KPI">
                      <KPISheet />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kpi/templates"
                  element={
                    <ProtectedRoute requiredModule="KPI">
                      <KPITemplateManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kpi/admin"
                  element={
                    <ProtectedRoute requiredModule="KPI">
                      <KPIAdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kpi/pulse"
                  element={
                    <ProtectedRoute requiredModule="KPI">
                      <KPIPulseDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kpi/reviews"
                  element={
                    <ProtectedRoute requiredModule="KPI">
                      <KPIReviewerDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Project Nucleus */}
                <Route path="/project-nucleus" element={<NucleusHome />} />

                {/* DGFT Module */}
                <Route path="/dgft" element={<DgftTabs />} />
                <Route path="/dgft/:tab" element={<DgftTabs />} />
                <Route
                  path="/dgft/authorization-details/:id"
                  element={<ViewAuthorizationDetails />}
                />
              </Routes>
            </Box>
          </Box>
        </SearchQueryProvider>
      </TabValueContext.Provider>
    );
}

function HomePage() {
  return (
    <BranchProvider>
      <HomePageContent />
    </BranchProvider>
  );
}

export default HomePage;
