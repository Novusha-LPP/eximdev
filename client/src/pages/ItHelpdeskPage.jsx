import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import { isHRAdminUser } from "../utils/hrAdminRoleHelper";
import ITHelpdeskLayout from "../components/it-helpdesk/ITHelpdeskLayout";
import ITHelpdeskHome from "../components/it-helpdesk/ITHHelpdeskHome";
import AssetManagement from "../components/it-helpdesk/AssetManagement";
import TicketManagement from "../components/it-helpdesk/TicketManagement";
import VendorManagement from "../components/it-helpdesk/VendorManagement";
import InventoryManagement from "../components/it-helpdesk/InventoryManagement";
import UnifiedAssetInventory from "../components/it-helpdesk/UnifiedAssetInventory";
import ProcurementManagement from "../components/it-helpdesk/ProcurementManagement";
import LicenseManagement from "../components/it-helpdesk/LicenseManagement";
import ITReports from "../components/it-helpdesk/ITReports";
import ITNotifications from "../components/it-helpdesk/ITNotifications";
import UserManagement from "../components/it-helpdesk/UserManagement";
import RolesPermissions from "../components/it-helpdesk/RolesPermissions";
import AuditLogs from "../components/it-helpdesk/AuditLogs";

export default function ItHelpdeskPage() {
  const { user } = useContext(UserContext);
  const isHRAdmin = isHRAdminUser(user);

  // Normal users (non-HR Admin, non-Hardware & Network Engineer, non-Admin)
  // only have access to Helpdesk & Tickets view
  if (!isHRAdmin) {
    return (
      <ITHelpdeskLayout isLimitedUser={true}>
        <Routes>
          <Route path="/" element={<TicketManagement />} />
          <Route path="/tickets" element={<TicketManagement />} />
          <Route path="*" element={<Navigate to="/it-helpdesk/tickets" replace />} />
        </Routes>
      </ITHelpdeskLayout>
    );
  }

  return (
    <ITHelpdeskLayout isLimitedUser={false}>
      <Routes>
        <Route path="/" element={<ITHelpdeskHome />} />
        <Route path="/assets" element={<AssetManagement />} />
        <Route path="/tickets" element={<TicketManagement />} />
        <Route path="/vendors" element={<VendorManagement />} />
        <Route path="/inventory" element={<InventoryManagement />} />
        <Route path="/unified-assets" element={<UnifiedAssetInventory />} />
        <Route path="/procurement" element={<ProcurementManagement />} />
        <Route path="/licenses" element={<LicenseManagement />} />
        <Route path="/domains" element={<Navigate to="/it-helpdesk/notifications?category=domain" replace />} />
        <Route path="/warranty" element={<Navigate to="/it-helpdesk/notifications?category=warranty" replace />} />
        <Route path="/reports" element={<ITReports />} />
        <Route path="/notifications" element={<ITNotifications />} />
        <Route path="/administration/audit" element={<AuditLogs />} />
        <Route path="/audit" element={<AuditLogs />} />
        <Route path="/administration/roles" element={<RolesPermissions />} />
        <Route path="/roles" element={<RolesPermissions />} />
        <Route path="/administration/users" element={<UserManagement />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/settings" element={<RolesPermissions />} />
        <Route path="/administration/settings" element={<Navigate to="/it-helpdesk" replace />} />
        <Route path="/administration/setting" element={<Navigate to="/it-helpdesk" replace />} />
        <Route path="*" element={<Navigate to="/it-helpdesk" replace />} />
      </Routes>
    </ITHelpdeskLayout>
  );
}
