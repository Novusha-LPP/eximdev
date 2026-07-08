import React from "react";
import { Box, Container, Typography } from "@mui/material";
import { Routes, Route, Navigate } from "react-router-dom";
import ITHelpdeskHome from "../components/it-helpdesk/ITHHelpdeskHome";
import AssetManagement from "../components/it-helpdesk/AssetManagement";
import TicketManagement from "../components/it-helpdesk/TicketManagement";
import VendorManagement from "../components/it-helpdesk/VendorManagement";
import InventoryManagement from "../components/it-helpdesk/InventoryManagement";
import LicenseManagement from "../components/it-helpdesk/LicenseManagement";
import ITReports from "../components/it-helpdesk/ITReports";
import ITNotifications from "../components/it-helpdesk/ITNotifications";
import UserManagement from "../components/it-helpdesk/UserManagement";
import RolesPermissions from "../components/it-helpdesk/RolesPermissions";
import AuditLogs from "../components/it-helpdesk/AuditLogs";
import EmailConfiguration from "../components/it-helpdesk/EmailConfiguration";
import SystemSettings from "../components/it-helpdesk/SystemSettings";
// import { AuditLogProvider } from "../contexts/AuditLogContext";

export default function ItHelpdeskPage() {
  return (
    <Box>
      <Routes>
        <Route path="/" element={<ITHelpdeskHome />} />
        <Route path="/assets" element={<AssetManagement />} />
        <Route path="/tickets" element={<TicketManagement />} />
        {/* <Route path="/vendors" element={<VendorManagement />} /> */}

        <Route
          path="/vendors"
          element={
            // <AuditLogProvider>
            <VendorManagement />
            // </AuditLogProvider>
          }
        />



        <Route path="/inventory" element={<InventoryManagement />} />
        <Route path="/licenses" element={<LicenseManagement />} />
        <Route path="/reports" element={<ITReports />} />
        <Route path="/notifications" element={<ITNotifications />} />
        <Route path="/administration/users" element={<UserManagement />} />
        <Route path="/administration/roles" element={<RolesPermissions />} />
        <Route path="/administration/audit" element={<AuditLogs />} />
        <Route path="/administration/email" element={<EmailConfiguration />} />
        <Route path="/administration/settings" element={<SystemSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </Box>
  );
}
