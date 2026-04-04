import React, { useState, useEffect, useContext } from "react";
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
import { UserContext } from "../../contexts/UserContext";

const { Option, OptGroup } = Select;
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
  "Document Collection",
  "Open Points",

  "DGFT",
  "KPI",
  "MRM",
  "Project Nucleus", // Keeping this as it was in the original list
  "Pulse",
  "Attendance"
];

function ModuleUserList() {
  const { user } = useContext(UserContext);
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleUsers, setModuleUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsersToRemove, setSelectedUsersToRemove] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamUserIds, setTeamUserIds] = useState([]);
  const [bulkUserIds, setBulkUserIds] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [icdOptions, setIcdOptions] = useState([]);
  const [selectedIcdCodes, setSelectedIcdCodes] = useState([]);

  // Fetch users whenever a module is selected
  useEffect(() => {
    if (selectedModule) {
      fetchUsersInModule(selectedModule);
      fetchTeams();
      fetchBranches();
    } else {
      setModuleUsers([]);
      setTeams([]);
      setSelectedTeamId(null);
      setTeamUserIds([]);
      setBulkUserIds([]);
      setBranches([]);
      setSelectedBranchIds([]);
      setIcdOptions([]);
      setSelectedIcdCodes([]);
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

  const fetchTeams = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/teams/all`
      );
      setTeams(res.data?.teams || []);
    } catch (error) {
      console.error("Error fetching teams:", error);
      message.error("Failed to load teams.");
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/admin/get-branches`,
        { withCredentials: true }
      );
      const list = res.data || [];
      setBranches(list);
      const ports = [...new Set(list.flatMap(b => (b.ports || []).map(p => p.port_name)))];
      setIcdOptions(ports);
    } catch (error) {
      console.error("Error fetching branches:", error);
      message.error("Failed to load branches.");
    }
  };


  const handleRemoveUsers = async () => {
    if (selectedUsersToRemove.length === 0) return;

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAllUsers = async () => {
    if (!selectedModule) return;

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/assign-module-to-all`,
        { moduleName: selectedModule }
      );
      message.success(`Assigned ${selectedModule} to all users.`);
      fetchUsersInModule(selectedModule);
    } catch (error) {
      console.error("Error assigning module to all users:", error);
      message.error("Failed to assign module to all users.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignAllUsers = async () => {
    if (!selectedModule) return;

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/unassign-module-from-all`,
        { moduleName: selectedModule }
      );
      message.success(`Removed ${selectedModule} from all users.`);
      fetchUsersInModule(selectedModule);
    } catch (error) {
      console.error("Error unassigning module from all users:", error);
      message.error("Failed to unassign module from all users.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeamUsers = async (userIds) => {
    if (!selectedModule || !userIds || userIds.length === 0) {
      message.warning("Select at least one user from the team");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/assign-users-to-module`,
        {
          moduleName: selectedModule,
          userIds
        }
      );
      message.success(`Assigned ${selectedModule} to ${userIds.length} user(s).`);
      fetchUsersInModule(selectedModule);
    } catch (error) {
      console.error("Error assigning module to users:", error);
      message.error("Failed to assign module to users.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBranchToUsers = async () => {
    if (selectedBranchIds.length === 0 || bulkUserIds.length === 0) {
      message.warning("Select at least one branch and one user");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/admin/assign-branch-to-users`,
        { branch_ids: selectedBranchIds, userIds: bulkUserIds },
        { withCredentials: true }
      );
      message.success("Branches assigned to selected users");
    } catch (error) {
      console.error("Error assigning branch to users:", error);
      message.error(error.response?.data?.error || "Failed to assign branch to users");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignIcdToUsers = async () => {
    if (selectedIcdCodes.length === 0 || bulkUserIds.length === 0) {
      message.warning("Select ICD codes and at least one user");
      return;
    }

    if (!user?.username) {
      message.error("Unable to resolve admin username");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/admin/assign-icd-code-to-users`,
        {
          userIds: bulkUserIds,
          selectedIcdCodes,
          adminUsername: user.username
        },
        { withCredentials: true }
      );
      message.success("ICD codes assigned to selected users");
    } catch (error) {
      console.error("Error assigning ICD codes to users:", error);
      message.error(error.response?.data?.message || "Failed to assign ICD codes to users");
    } finally {
      setLoading(false);
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
              <Space>
                <Popconfirm
                  title={`Assign ${selectedModule} to all users?`}
                  onConfirm={handleAssignAllUsers}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary" loading={loading}>
                    Assign To All
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title={`Remove ${selectedModule} from all users?`}
                  onConfirm={handleUnassignAllUsers}
                  okText="Yes"
                  cancelText="No"
                  danger
                >
                  <Button danger loading={loading}>
                    Unassign From All
                  </Button>
                </Popconfirm>
                {selectedUsersToRemove.length > 0 && (
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
                )}
              </Space>
            }
          >
            <Spin spinning={loading}>
              {teams.length > 0 && (
                <div style={{ marginBottom: 16, padding: '12px 12px', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Text strong>Assign by Team</Text>
                    <Select
                      style={{ width: '100%', maxWidth: 420 }}
                      placeholder="Select a Team..."
                      value={selectedTeamId}
                      onChange={(val) => {
                        setSelectedTeamId(val);
                        setTeamUserIds([]);
                      }}
                    >
                      {teams.map(t => (
                        <Option key={t._id} value={t._id}>{t.name}</Option>
                      ))}
                    </Select>
                    {selectedTeamId && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 16px' }}>
                          {(teams.find(t => t._id === selectedTeamId)?.membersDetails || []).map(m => {
                            const memberName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.username;
                            const memberId = m._id || m.userId;
                            return (
                              <label key={memberId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Checkbox
                                  checked={teamUserIds.includes(memberId)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTeamUserIds(prev => [...prev, memberId]);
                                    } else {
                                      setTeamUserIds(prev => prev.filter(id => id !== memberId));
                                    }
                                  }}
                                />
                                <span style={{ fontSize: 12, color: '#374151' }}>{memberName}</span>
                              </label>
                            );
                          })}
                        </div>
                        <Space>
                          <Button onClick={() => handleAssignTeamUsers(teamUserIds)} loading={loading}>
                            Assign Selected Team Users
                          </Button>
                          <Button
                            type="primary"
                            onClick={() => {
                              const members = teams.find(t => t._id === selectedTeamId)?.membersDetails || [];
                              const ids = members.map(m => m._id || m.userId).filter(Boolean);
                              handleAssignTeamUsers(ids);
                            }}
                            loading={loading}
                          >
                            Assign Entire Team
                          </Button>
                        </Space>
                      </>
                    )}
                  </Space>
                </div>
              )}
              {teams.length > 0 && (
                <div style={{ marginBottom: 16, padding: '12px 12px', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Text strong>Bulk Assign Branch / ICD (Select Users by Team)</Text>
                    <Select
                      mode="multiple"
                      style={{ width: '100%' }}
                      placeholder="Select users (grouped by team)"
                      value={bulkUserIds}
                      onChange={setBulkUserIds}
                      optionFilterProp="label"
                      showSearch
                    >
                      {teams.map(team => (
                        <OptGroup key={team._id} label={team.name}>
                          {(team.membersDetails || []).map(member => {
                            const memberId = member._id || member.userId;
                            const memberName = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.username;
                            return (
                              <Option key={memberId} value={memberId} label={memberName}>
                                {memberName}
                              </Option>
                            );
                          })}
                        </OptGroup>
                      ))}
                    </Select>

                    <Space style={{ width: '100%' }} wrap>
                      <Select
                        mode="multiple"
                        style={{ minWidth: 240 }}
                        placeholder="Select branches"
                        value={selectedBranchIds}
                        onChange={setSelectedBranchIds}
                      >
                        {branches.map(b => (
                          <Option key={b._id} value={b._id}>
                            {b.branch_name} ({b.branch_code}) - {b.category}
                          </Option>
                        ))}
                      </Select>

                      <Button onClick={handleAssignBranchToUsers} loading={loading}>
                        Assign Branch to Selected Users
                      </Button>
                    </Space>

                    <Space style={{ width: '100%' }} wrap>
                      <Select
                        mode="multiple"
                        style={{ minWidth: 320 }}
                        placeholder="Select ICD codes"
                        value={selectedIcdCodes}
                        onChange={setSelectedIcdCodes}
                        showSearch
                      >
                        {icdOptions.map(code => (
                          <Option key={code} value={code}>{code}</Option>
                        ))}
                      </Select>

                      <Button onClick={handleAssignIcdToUsers} loading={loading}>
                        Assign ICD to Selected Users
                      </Button>
                    </Space>
                  </Space>
                </div>
              )}
              {moduleUsers.length > 0 ? (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px 24px',
                    marginBottom: moduleUsers.length > 30 ? 16 : 0
                  }}>
                    {moduleUsers.map(user => {
                      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
                      const secondary = user.username || user.email || (user._id ? `ID ${String(user._id).slice(-6)}` : '');
                      const displayName = fullName || secondary || 'Unknown User';
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
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {displayName}
                              </span>
                              {secondary && fullName && (
                                <span style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {secondary}
                                </span>
                              )}
                            </div>
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
