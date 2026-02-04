import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Typography,
  Select,
  Button,
  List,
  Checkbox,
  Tag,
  Space,
  message,
  Spin,
  Empty,
  Popconfirm
} from "antd";
import { DeleteOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";

const { Option } = Select;
const { Title, Text } = Typography;

// Predefined module list - ensure this matches your backend/other components
// Predefined module list - synced with AssignModule.js
const MODULES = [
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
  "Open Points",
  "KPI",
  "MRM",
  "Project Nucleus", // Keeping this as it was in the original list
];

function ModuleUserList() {
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleUsers, setModuleUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsersToRemove, setSelectedUsersToRemove] = useState([]);

  // Fetch users whenever a module is selected
  useEffect(() => {
    if (selectedModule) {
      fetchUsersInModule(selectedModule);
    } else {
      setModuleUsers([]);
    }
  }, [selectedModule]);

  const fetchUsersInModule = async (moduleName) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-all-users`
      );

      const targetModule = moduleName.trim().toLowerCase();

      const filtered = res.data.filter((user) => {
        if (!user.modules || !Array.isArray(user.modules)) return false;

        // Check if any user module matches the target module (loose comparison)
        return user.modules.some(m => m && m.trim().toLowerCase() === targetModule);
      });

      setModuleUsers(filtered);
      setSelectedUsersToRemove([]); // Reset selection on module change
    } catch (error) {
      console.error("Error fetching users:", error);
      message.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };


  const handleRemoveUsers = async () => {
    if (selectedUsersToRemove.length === 0) return;

    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/unassign-users-from-module`,
        {
          moduleName: selectedModule,
          userIds: selectedUsersToRemove,
        }
      );

      message.success(`Successfully removed ${selectedUsersToRemove.length} user(s).`);

      // Refresh list
      fetchUsersInModule(selectedModule);
    } catch (error) {
      console.error("Error removing users:", error);
      message.error("Failed to remove users. Please try again.");
    }
  };

  const handleRemoveSingleUser = (userId) => {
    removeDirectly([userId]);
  };

  const removeDirectly = async (ids) => {
    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/unassign-users-from-module`,
        {
          moduleName: selectedModule,
          userIds: ids,
        }
      );
      message.success("User removed successfully.");
      fetchUsersInModule(selectedModule);
    } catch (e) {
      console.error(e);
      message.error("Failed to remove user.");
    } finally {
      setLoading(false);
    }
  };

  const onUserCheck = (userId, checked) => {
    if (checked) {
      setSelectedUsersToRemove([...selectedUsersToRemove, userId]);
    } else {
      setSelectedUsersToRemove(selectedUsersToRemove.filter(id => id !== userId));
    }
  };

  return (
    <Card bordered={false} title="Review Module Assignments">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Text type="secondary">
          Select a module to view all assigned users. You can then remove multiple users at once.
        </Text>

        <Select
          style={{ width: '100%', maxWidth: 400 }}
          placeholder="Select a Module..."
          onChange={setSelectedModule}
          value={selectedModule}
        >
          {MODULES.map(mod => <Option key={mod} value={mod}>{mod}</Option>)}
        </Select>

        {selectedModule && (
          <Card
            type="inner"
            title={
              <Space>
                <TeamOutlined />
                <span>Users in "{selectedModule}" ({moduleUsers.length})</span>
              </Space>
            }
            extra={
              selectedUsersToRemove.length > 0 && (
                <Popconfirm
                  title={`Remove ${selectedUsersToRemove.length} users from ${selectedModule}?`}
                  onConfirm={handleRemoveUsers}
                  okText="Yes"
                  cancelText="No"
                  danger
                >
                  <Button danger icon={<DeleteOutlined />} loading={loading}>
                    Remove Selected ({selectedUsersToRemove.length})
                  </Button>
                </Popconfirm>
              )
            }
          >
            <Spin spinning={loading}>
              {moduleUsers.length > 0 ? (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px 24px',
                    marginBottom: moduleUsers.length > 30 ? 16 : 0
                  }}>
                    {moduleUsers.map(user => {
                      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
                      return (
                        <div
                          key={user._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            borderBottom: '1px solid #f0f0f0',
                            background: selectedUsersToRemove.includes(user._id) ? '#e6f7ff' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                            <Checkbox
                              checked={selectedUsersToRemove.includes(user._id)}
                              onChange={(e) => onUserCheck(user._id, e.target.checked)}
                            />
                            <Text strong style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {fullName}
                            </Text>
                          </div>
                          <Popconfirm
                            title="Remove this user?"
                            onConfirm={() => handleRemoveSingleUser(user._id)}
                            okButtonProps={{ danger: true }}
                          >
                            <Button type="text" danger size="small" icon={<DeleteOutlined />} style={{ flexShrink: 0 }} />
                          </Popconfirm>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Empty description="No users assigned to this module" />
              )}
            </Spin>
          </Card>
        )}
      </Space>
    </Card>
  );
}

export default React.memo(ModuleUserList);
