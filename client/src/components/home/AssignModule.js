import React, { useEffect, useState } from "react";
import axios from "axios";
import { Transfer, Card, message, Spin, Empty, Checkbox, Typography, Space } from "antd";

const allModules = [
  "Import - DSR",
  "Import - DO",
  "Import - Operations",
  "Import - Add",
  "Import - Billing",
  "Billing Confirmation",
  "Import Utility Tool",
  "Report",
  "Audit Trail",
  "Export",
  "Export - Directories",
  "Export - Audit Trail",
  "Export - Charges",
  "Export - Documentation",
  "Export - E-Sanchit",
  "Export - Jobs",
  "Export - Operation",
  "Accounts",
  "Billing Reports",
  "Procurement & Insurance SOPs",
  "Employee Onboarding",
  "Employee KYC",
  "HR",
  "Inward Register",
  "Outward Register",
  "Customer KYC",
  "Exit Feedback",
  "Update Employee Data",
  "e-Sanchit",
  "Documentation",
  "CRM",
  "Document Collection",
  "KPI",
  "Open Points",
  "Supplier Scorecard",
  "AMC Suppliers Renewal",
  "AMC Visitor Logs",
  "Admin Equipment Checklist",
  "MRM",
  "DGFT",
  "Pulse",
  "Team Pulse",
  "MasterDirectory",
  "Attendance",
  "Attendance V2",
  "Bill Cover",
  "IT Helpdesk",
  "Karma Points",
  "Tally Transactions",
  "5S Audit",
  "First Aid",
  "Transport Invoicing"
];

// allowedModules: if provided, only these modules can be assigned (for HOD restriction)
function AssignModule({ selectedUser, allowedModules, allowInactive = false }) {
  const [targetKeys, setTargetKeys] = useState([]);
  const [kpiPermissions, setKpiPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingKpi, setSavingKpi] = useState(false);

  // Use allowedModules if provided, otherwise show all modules
  const availableModulesList = allowedModules && allowedModules.length > 0
    ? allModules.filter(m => allowedModules.includes(m))
    : allModules;

  // Transform modules to Transfer data source format
  const mockData = availableModulesList.map((module) => ({
    key: module,
    title: module,
  }));

  useEffect(() => {
    async function getUserModules() {
      if (!selectedUser) {
        setTargetKeys([]);
        setKpiPermissions([]);
        return;
      }

      setLoading(true);
      try {
        const res = await axios(
          `${process.env.REACT_APP_API_STRING}/get-user/${selectedUser}${allowInactive ? "?includeInactive=true" : ""}`,
          { withCredentials: true }
        );
        let userModules = res.data.modules || [];
        let fetchedKpiPerms = Array.isArray(res.data.kpi_permissions) ? res.data.kpi_permissions : [];

        // If KPI is already assigned to this user but no sub-permission is set, default to ['assign'] in UI
        const hasKpi = userModules.some(m => String(m).toLowerCase() === "kpi");
        if (hasKpi && fetchedKpiPerms.length === 0) {
          fetchedKpiPerms = ["assign"];
        }

        setKpiPermissions(fetchedKpiPerms);

        // Map legacy individual procurement sub-module entries to the unified module
        const hasProcurement = userModules.some(m =>
          ["Procurement & Insurance SOPs", "RM Procurement SOP", "Tyre Procurement SOP", "Fleet Insurance SOP"].includes(m)
        );
        if (hasProcurement && !userModules.includes("Procurement & Insurance SOPs")) {
          userModules = [...userModules, "Procurement & Insurance SOPs"];
        }
        // Filter out any modules that might be in DB but not in our static list effectively ensures valid keys
        setTargetKeys(userModules.filter(m => allModules.includes(m)));
      } catch (error) {
        console.error("Error fetching user modules:", error);
        message.error("Failed to fetch user modules");
      } finally {
        setLoading(false);
      }
    }

    getUserModules();
  }, [selectedUser, allowInactive]);

  const handleToggleKpiPerm = async (permKey, isChecked) => {
    let nextPerms = [];
    if (isChecked) {
      nextPerms = Array.from(new Set([...kpiPermissions, permKey]));
    } else {
      nextPerms = kpiPermissions.filter((p) => p !== permKey);
    }
    setKpiPermissions(nextPerms);

    const isCurrentlyAssigned = targetKeys.includes("KPI");

    // If KPI is not yet assigned (in Available list), ticking a sub-checkbox automatically assigns the KPI module
    if (!isCurrentlyAssigned && isChecked) {
      const nextTargetKeys = [...targetKeys, "KPI"];
      setTargetKeys(nextTargetKeys);
      try {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/assign-modules`,
          { modules: ["KPI"], username: selectedUser },
          { withCredentials: true }
        );
        message.success(`Assigned KPI module with permission: ${permKey}`);
      } catch (err) {
        console.error("Error auto-assigning KPI module:", err);
      }
    }

    try {
      setSavingKpi(true);
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/kpi/user-permissions`,
        {
          username: selectedUser,
          kpi_permissions: nextPerms,
        },
        { withCredentials: true }
      );
      if (isCurrentlyAssigned) {
        message.success(`KPI permission "${permKey}" ${isChecked ? "enabled" : "disabled"}`);
      }
    } catch (err) {
      console.error("Error updating KPI permissions:", err);
      message.error("Failed to update KPI permissions");
    } finally {
      setSavingKpi(false);
    }
  };

  const onChange = async (nextTargetKeys, direction, moveKeys) => {
    // optimistic update
    setTargetKeys(nextTargetKeys);

    try {
      if (direction === "right") {
        // Assign modules
        await axios.post(`${process.env.REACT_APP_API_STRING}/assign-modules`, {
          modules: moveKeys,
          username: selectedUser,
        }, { withCredentials: true });
        message.success(`Assigned ${moveKeys.length} module(s)`);

        // If KPI was moved to Assigned, by default give it 'assign' permission if none selected!
        if (moveKeys.includes("KPI")) {
          const nextPerms = kpiPermissions.length > 0 ? kpiPermissions : ["assign"];
          setKpiPermissions(nextPerms);
          await axios.post(
            `${process.env.REACT_APP_API_STRING}/kpi/user-permissions`,
            { username: selectedUser, kpi_permissions: nextPerms },
            { withCredentials: true }
          );
        }
      } else {
        // Unassign modules - if removing Procurement, also clean up legacy sub-module keys
        let keysToRemove = [...moveKeys];
        if (moveKeys.includes("Procurement & Insurance SOPs")) {
          keysToRemove.push("RM Procurement SOP", "Tyre Procurement SOP", "Fleet Insurance SOP");
        }

        // If removing KPI module, also clear KPI sub-permissions
        if (moveKeys.includes("KPI")) {
          setKpiPermissions([]);
          axios.post(
            `${process.env.REACT_APP_API_STRING}/kpi/user-permissions`,
            { username: selectedUser, kpi_permissions: [] },
            { withCredentials: true }
          ).catch((e) => console.error("Error clearing KPI permissions:", e));
        }

        await axios.post(`${process.env.REACT_APP_API_STRING}/unassign-modules`, {
          modules: keysToRemove,
          username: selectedUser,
        }, { withCredentials: true });
        message.success(`Removed ${moveKeys.length} module(s)`);
      }
    } catch (error) {
      console.error("Error updating modules:", error);
      message.error(error.response?.data?.message || "Failed to update modules");
    }
  };

  if (!selectedUser) {
    return <Empty description="Please select a user first" />;
  }

  const isKpiAssigned = targetKeys.includes("KPI");

  return (
    <Card title={`Assign Modules — ${selectedUser}`} size="small">
      <style>{`
        .kpi-transfer .ant-transfer-list-content-item {
          height: auto !important;
          min-height: 34px;
          padding-top: 4px;
          padding-bottom: 4px;
        }
        .kpi-transfer .ant-transfer-list-content-item-text {
          white-space: normal !important;
          width: 100%;
        }
      `}</style>
      <Spin spinning={loading}>
        <Transfer
          className="kpi-transfer"
          dataSource={mockData}
          titles={["Available", "Assigned"]}
          targetKeys={targetKeys}
          onChange={onChange}
          filterOption={(inputValue, item) =>
            item.title.toLowerCase().includes(inputValue.toLowerCase())
          }
          render={(item) => {
            if (item.key === "KPI") {
              const assigned = targetKeys.includes("KPI");
              return {
                label: (
                  <div style={{ display: "inline-block", width: "100%", verticalAlign: "top" }}>
                    <div style={{ fontWeight: assigned ? 600 : "normal", color: assigned ? "#1890ff" : "inherit" }}>
                      {item.title} {assigned ? "" : <span style={{ fontSize: 11, color: "#8c8c8c", fontWeight: "normal" }}>(Click check to assign)</span>}
                    </div>
                    {/* Always visible before and after assignment */}
                    <div
                      style={{
                        marginTop: 4,
                        marginBottom: 4,
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        background: assigned ? "#f6ffed" : "#fafafa",
                        padding: "3px 8px",
                        borderRadius: 4,
                        border: assigned ? "1px solid #b7eb8f" : "1px dashed #d9d9d9",
                        width: "fit-content",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label style={{ cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                        <input
                          type="checkbox"
                          checked={kpiPermissions.includes("assign")}
                          onChange={(e) => handleToggleKpiPerm("assign", e.target.checked)}
                        />
                        <span style={{ color: "#389e0d", fontWeight: 600 }}>Assign</span>
                      </label>
                      <label style={{ cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                        <input
                          type="checkbox"
                          checked={kpiPermissions.includes("view")}
                          onChange={(e) => handleToggleKpiPerm("view", e.target.checked)}
                        />
                        <span style={{ color: "#096dd9", fontWeight: 600 }}>View</span>
                      </label>
                      <label style={{ cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                        <input
                          type="checkbox"
                          checked={kpiPermissions.includes("manage")}
                          onChange={(e) => handleToggleKpiPerm("manage", e.target.checked)}
                        />
                        <span style={{ color: "#531dab", fontWeight: 600 }}>Manage</span>
                      </label>
                    </div>
                  </div>
                ),
                value: item.title,
              };
            }
            return item.title;
          }}
          listStyle={{
            width: "48%",
            height: 520,
          }}
          showSearch
        />

        {/* Dedicated KPI Module Sub-Permissions Card underneath */}
        <div
          style={{
            marginTop: 16,
            padding: "14px 18px",
            background: isKpiAssigned ? "#f6ffed" : "#fbfbfb",
            border: isKpiAssigned ? "1px solid #b7eb8f" : "1px dashed #d9d9d9",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Typography.Text strong style={{ color: isKpiAssigned ? "#237804" : "#595959", fontSize: 13 }}>
              📊 KPI Module Sub-Permissions for {selectedUser} {isKpiAssigned ? "(Assigned)" : "(Ticking will automatically assign KPI)"}
            </Typography.Text>
            {savingKpi && <Spin size="small" />}
          </div>
          <div style={{ fontSize: 12, color: "#595959", marginBottom: 10 }}>
            Only users with the <strong>Assign</strong> checkbox checked will appear in the KPI submitters and non-submitters lists.
          </div>
          <Space size={24} wrap>
            <Checkbox
              checked={kpiPermissions.includes("assign")}
              onChange={(e) => handleToggleKpiPerm("assign", e.target.checked)}
              style={{ fontWeight: 600, color: "#389e0d" }}
            >
              Assign (Submitter)
            </Checkbox>
            <Checkbox
              checked={kpiPermissions.includes("view")}
              onChange={(e) => handleToggleKpiPerm("view", e.target.checked)}
              style={{ fontWeight: 600, color: "#096dd9" }}
            >
              View (Viewer)
            </Checkbox>
            <Checkbox
              checked={kpiPermissions.includes("manage")}
              onChange={(e) => handleToggleKpiPerm("manage", e.target.checked)}
              style={{ fontWeight: 600, color: "#531dab" }}
            >
              Manage (Manager)
            </Checkbox>
          </Space>
        </div>
      </Spin>
    </Card>
  );
}

export default React.memo(AssignModule);
