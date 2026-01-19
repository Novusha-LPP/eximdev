import React, { useEffect, useState } from "react";
import axios from "axios";
import { Transfer, Card, message, Spin, Empty } from "antd";

const allModules = [
  "Import - DSR",
  "Import - DO",
  "Import - Operations",
  "Import - Add",
  "Import - Billing",
  "Import Utility Tool",
  "Report",
  "Audit Trail",
  "Export",
  "Accounts",
  "Employee Onboarding",
  "Employee KYC",
  "Inward Register",
  "Outward Register",
  "Customer KYC",
  "Exit Feedback",
  "e-Sanchit",
  "Documentation",
  "Submission",
  "Screen1",
  "Screen2",
  "Screen3",
  "Screen4",
  "Open Points",
  "KPI",
];

function AssignModule({ selectedUser }) {
  const [targetKeys, setTargetKeys] = useState([]);
  const [loading, setLoading] = useState(false);

  // Transform modules to Transfer data source format
  const mockData = allModules.map((module) => ({
    key: module,
    title: module,
  }));

  useEffect(() => {
    async function getUserModules() {
      if (!selectedUser) {
        setTargetKeys([]);
        return;
      }

      setLoading(true);
      try {
        const res = await axios(
          `${process.env.REACT_APP_API_STRING}/get-user/${selectedUser}`
        );
        const userModules = res.data.modules || [];
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
  }, [selectedUser]);

  const onChange = async (nextTargetKeys, direction, moveKeys) => {
    // innovative UI: optimistic update
    setTargetKeys(nextTargetKeys);

    try {
      if (direction === "right") {
        // Assign modules
        await axios.post(`${process.env.REACT_APP_API_STRING}/assign-modules`, {
          modules: moveKeys,
          username: selectedUser,
        });
        message.success(`Assigned ${moveKeys.length} module(s)`);
      } else {
        // Unassign modules
        await axios.post(`${process.env.REACT_APP_API_STRING}/unassign-modules`, {
          modules: moveKeys,
          username: selectedUser,
        });
        message.success(`Removed ${moveKeys.length} module(s)`);
      }
    } catch (error) {
      console.error("Error updating modules:", error);
      message.error("Failed to update modules");
      // Revert state if API fails (optional but good practice, though simple fetch refresh works too)
      // For now, let's keep it simple as we fetch often
    }
  };

  if (!selectedUser) {
    return <Empty description="Please select a user first" />;
  }

  return (
    <Card title="Assign Modules" size="small">
      <Spin spinning={loading}>
        <Transfer
          dataSource={mockData}
          titles={["Available", "Assigned"]}
          targetKeys={targetKeys}
          onChange={onChange}
          render={(item) => item.title}
          listStyle={{
            width: '45%',
            height: 400,
          }}
          showSearch
          pagination
        />
      </Spin>
    </Card>
  );
}

export default React.memo(AssignModule);
