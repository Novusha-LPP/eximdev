import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Select,
  Tabs,
  Card,
  Typography,
  Space,
  Layout,
  Avatar,
  Empty,
  Input,
  Button,
  Segmented,
  Switch,
  message,
  Modal
} from "antd";
import {
  UserOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  EnvironmentOutlined,
  ProjectOutlined,
  RobotOutlined,
  SearchOutlined,
  GroupOutlined,
  InfoCircleOutlined,
  TeamOutlined
} from "@ant-design/icons";

import AssignModule from "./AssignModule";
import AssignRole from "./AssignRole/AssignRole";
import ChangePasswordByAdmin from "./AssignRole/ChangePasswordByAdmin";
import SelectIcdCode from "./AssignRole/SelectIcdCode";
import AssignImporters from "./AssignImporters";
import AssignEximBot from "./AssignEximBot/AssignEximBot";
import ModuleUserList from "./ModuleUserList";
import UserProfile from "../userProfile/UserProfile";
import HodManagement from "./HodManagement";

const { Option } = Select;
const { Title, Text } = Typography;
const { Sider, Content } = Layout;

function Assign() {
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Assign Module");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("Users"); // 'Users' or 'Bulk Manage'
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Active");

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

  useEffect(() => {
    async function getUsers() {
      try {
        const res = await axios(
          `${process.env.REACT_APP_API_STRING}/get-all-users`
        );
        setUserList(res.data.map((user) => ({
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isActive: user.isActive,
          deactivatedAt: user.deactivatedAt
        })));
      } catch (error) {
        console.error("Error fetching user list:", error);
      }
    }

    getUsers();
  }, []);

  // Calculate active and inactive user counts
  const activeUserCount = userList.filter(user => user.isActive !== false).length;
  const inactiveUserCount = userList.filter(user => user.isActive === false).length;

  const filteredUsers = userList.filter(user => {
    const term = searchTerm.toLowerCase();
    const username = user.username ? user.username.toLowerCase() : "";
    const firstName = user.firstName ? user.firstName.toLowerCase() : "";
    const lastName = user.lastName ? user.lastName.toLowerCase() : "";

    // Status Filter
    const isActive = user.isActive !== false; // undefined or true means active
    if (statusFilter === "Active" && !isActive) return false;
    if (statusFilter === "Inactive" && isActive) return false;

    return (
      username.includes(term) ||
      firstName.includes(term) ||
      lastName.includes(term)
    );
  });

  const getSelectedUserData = () => {
    return userList.find(u => u.username === selectedUser);
  };

  const handleToggleStatus = async (checked) => {
    if (!selectedUser) return;
    setUpdatingStatus(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/toggle-user-status`, {
        username: selectedUser,
        isActive: checked
      });

      message.success(res.data.message || "Status updated successfully");

      // Update local state
      setUserList(prev => prev.map(u =>
        u.username === selectedUser ? { ...u, isActive: checked, deactivatedAt: checked ? null : new Date() } : u
      ));

    } catch (error) {
      console.error("Error updating status:", error);
      message.error("Failed to update user status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleViewProfile = (e, username) => {
    e.stopPropagation();
    setProfileUser(username);
    setProfileModalVisible(true);
  };

  const closeProfileModal = () => {
    setProfileModalVisible(false);
    setProfileUser(null);
  };

  const userData = getSelectedUserData();

  const items = [
    {
      key: "Assign Module",
      label: "Admin Module",
      children: <AssignModule selectedUser={selectedUser} />,
    },
    {
      key: "Assign Role",
      label: "Assign Role",
      children: <AssignRole selectedUser={selectedUser} />,
    },
    {
      key: "Change Password",
      label: "Change Password",
      children: <ChangePasswordByAdmin selectedUser={selectedUser} />,
    },
    {
      key: "Assign ICD Code",
      label: "Assign ICD Code",
      children: <SelectIcdCode selectedUser={selectedUser} />,
    },
    {
      key: "Assign Importers",
      label: "Assign Importers",
      children: <AssignImporters selectedUser={selectedUser} />,
    },
    {
      key: "Assign Exim Bot",
      label: "Assign Exim Bot",
      children: <AssignEximBot selectedUser={selectedUser} />,
    },
  ];

  return (
    <Layout style={{ minHeight: "calc(100vh - 64px)", background: "#f0f2f5" }}>
      <Sider width={320} theme="light" style={{ borderRight: "1px solid #e8e8e8", height: 'calc(100vh - 64px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: 16, borderBottom: "1px solid #e8e8e8", flexShrink: 0 }}>
            <Title level={4} style={{ margin: "0 0 12px 0" }}>Users</Title>
            <Segmented
              block
              options={[
                { label: 'User List', value: 'Users', icon: <UserOutlined /> },
                { label: 'Bulk Manage', value: 'Bulk Manage', icon: <GroupOutlined /> },
                { label: 'All Teams', value: 'All Teams', icon: <TeamOutlined /> },
              ]}
              value={viewMode}
              onChange={(val) => {
                setViewMode(val);
                if (val !== 'Users') {
                  setSelectedUser(null);
                }
              }}
              style={{ marginBottom: 16 }}
            />
            {viewMode === 'Users' && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Segmented
                  block
                  size="small"
                  options={[
                    { label: `Active (${activeUserCount})`, value: 'Active' },
                    { label: `Inactive (${inactiveUserCount})`, value: 'Inactive' }
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </Space>
            )}
          </div>

          {viewMode === 'Users' ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => {
                  const displayName = (user.firstName && user.lastName)
                    ? `${user.firstName} ${user.lastName}`
                    : (user.username || "Unknown User");

                  return (
                    <div
                      key={user.username}
                      onClick={() => setSelectedUser(user.username)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        background: selectedUser === user.username ? '#e6f7ff' : 'transparent',
                        borderRight: selectedUser === user.username ? '3px solid #1890ff' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        opacity: user.isActive === false ? 0.6 : 1,
                        borderBottom: '1px solid #f0f0f0'
                      }}
                    >
                      <Avatar
                        icon={<UserOutlined />}
                        style={{
                          backgroundColor: user.isActive === false ? '#ccc' : (selectedUser === user.username ? '#1890ff' : undefined),
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ display: 'block' }} ellipsis>
                            {displayName ? displayName.toUpperCase() : ''}
                          </Text>
                          <InfoCircleOutlined
                            style={{ color: '#1890ff', fontSize: '16px' }}
                            onClick={(e) => handleViewProfile(e, user.username)}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{user.role || 'User'}</Text>
                          {user.isActive === false && <Text type="secondary" style={{ fontSize: 10 }}>Inactive</Text>}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <Empty description="No users found" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '20px 0' }} />
              )}
            </div>
          ) : viewMode === 'All Teams' ? (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <Text type="secondary">
                View all teams and their members on the right panel.
              </Text>
            </div>
          ) : (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <Text type="secondary">
                Select "User List" to manage individual users.
              </Text>
            </div>
          )}
        </div>
      </Sider>

      <Content style={{ padding: viewMode === 'All Teams' ? 0 : 24 }}>
        {viewMode === 'All Teams' ? (
          <HodManagement />
        ) : viewMode === 'Bulk Manage' ? (
          <ModuleUserList />
        ) : selectedUser && userData ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Card bordered={false}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size="middle">
                  <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: userData.isActive !== false ? '#1890ff' : '#ccc' }} />
                  <div>
                    <Title level={3} style={{ margin: 0 }}>
                      {userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : userData.username}
                    </Title>
                    <Space split={<div style={{ width: 1, height: 12, background: '#d9d9d9' }} />}>
                      <Text type="secondary">{userData.username}</Text>
                      <Text type="secondary">{userData.role || 'User'}</Text>
                      <Button type="link" size="small" onClick={(e) => handleViewProfile(e, userData.username)}>View Profile</Button>
                      <Text type={userData.isActive !== false ? "success" : "secondary"}>
                        {userData.isActive !== false ? 'Active' : 'Deactivated'}
                      </Text>
                    </Space>
                  </div>
                </Space>

                <Space direction="vertical" align="end">
                  <Space>
                    <Text>User Status:</Text>
                    <Switch
                      checked={userData.isActive !== false}
                      onChange={handleToggleStatus}
                      loading={updatingStatus}
                      checkedChildren="Active"
                      unCheckedChildren="Inactive"
                    />
                  </Space>
                  {userData.deactivatedAt && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Since: {new Date(userData.deactivatedAt).toLocaleDateString()}
                    </Text>
                  )}
                </Space>
              </div>
            </Card>

            <Card bordered={false} bodyStyle={{ padding: 0 }}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={items}
                size="large"
                tabPosition="top"
                type="card"
                style={{ padding: '0 0 24px 0' }}
                tabBarStyle={{ margin: 0, padding: '16px 16px 0 16px', background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}
              />
              <div style={{ padding: 24 }}>
                {/* Content handled by Tabs items */}
              </div>
            </Card>
          </Space>
        ) : (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Select a user from the sidebar to manage assignments or use Bulk Manage"
            />
          </div>
        )}

        <Modal
          title="User Profile"
          open={profileModalVisible}
          onCancel={closeProfileModal}
          footer={null}
          width={1000}
          style={{ top: 20 }}
          destroyOnClose
        >
          {profileUser && <UserProfile username={profileUser} />}
        </Modal>
      </Content>
    </Layout>
  );
}

export default React.memo(Assign);
