import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    Tabs,
    Card,
    Typography,
    Space,
    Layout,
    Avatar,
    Empty,
    Input,
    Button,
    message,
    Modal,
    Form,
    Select,
    Table,
    Tag,
    Popconfirm,
    Tooltip,
    Badge,
    Divider,
    Transfer,
    Spin,
    AutoComplete
} from "antd";
import {
    UserOutlined,
    TeamOutlined,
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    SearchOutlined,
    UserAddOutlined,
    KeyOutlined,
    AppstoreOutlined,
    EnvironmentOutlined
} from "@ant-design/icons";
import { UserContext } from "../../contexts/UserContext";
import AssignDepartment from "../home/AssignRole/AssignDepartment";
import EmployeeProfileWorkspace from "../attendance/admin/EmployeeProfileWorkspace";

const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const { Option } = Select;

function TeamDashboard() {
    const { user } = useContext(UserContext);
    const { teamId, userId, activeTab: urlTab } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal states
    const [createTeamModal, setCreateTeamModal] = useState(false);
    const [addMembersModal, setAddMembersModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem("teamDashboard_activeTab") || "Members";
    });
    const [editTeamModal, setEditTeamModal] = useState(false);
    const [teamToEdit, setTeamToEdit] = useState(null);
    const [hodModules, setHodModules] = useState([]); // HOD's assigned modules
    const [allUsers, setAllUsers] = useState([]); // All users for Admin to select HOD
    const [moduleTab, setModuleTab] = useState(() => {
        return localStorage.getItem("teamDashboard_moduleTab") || (teamId || userId ? "teams" : "users");
    });
    const [teamShortcutUserIds, setTeamShortcutUserIds] = useState([]);

    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    useEffect(() => {
        if (location.state?.openUsersTab) {
            setModuleTab("users");
            localStorage.setItem("teamDashboard_moduleTab", "users");
        }
    }, [location.state]);

    useEffect(() => {
        localStorage.setItem("teamDashboard_moduleTab", moduleTab);
    }, [moduleTab]);

    useEffect(() => {
        localStorage.setItem("teamDashboard_activeTab", activeTab);
    }, [activeTab]);

    // Fetch teams for HOD
    useEffect(() => {
        fetchTeams();
        fetchHodModules();
        if (user?.role === 'Admin') {
            fetchAllUsers();
        }
    }, [user]);

    const fetchAllUsers = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`);
            setAllUsers(res.data);
        } catch (error) {
            console.error("Error fetching all users:", error);
        }
    };

    // Fetch HOD's own modules
    const fetchHodModules = async () => {
        if (!user?.username) return;
        try {
            const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/get-user/${user.username}`
            );
            setHodModules(res.data.modules || []);
        } catch (error) {
            console.error("Error fetching HOD modules:", error);
        }
    };

    const fetchTeams = async () => {
        if (!user?.username) return;
        setLoading(true);
        try {
            // Admin can see all teams, HOD sees only their teams
            const url = user.role === 'Admin'
                ? `${process.env.REACT_APP_API_STRING}/teams/all`
                : `${process.env.REACT_APP_API_STRING}/teams/hod/${user.username}`;

            const res = await axios.get(url);
            if (res.data.success) {
                setTeams(res.data.teams);
                if (res.data.teams.length > 0 && !selectedTeam) {
                    setSelectedTeam(res.data.teams[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching teams:", error);
            message.error("Failed to fetch teams");
        } finally {
            setLoading(false);
        }
    };

    
    // Sync state with URL params
    useEffect(() => {
        if (teams.length > 0) {
            if (teamId) {
                const foundTeam = teams.find(t => t._id === teamId);
                if (foundTeam && (!selectedTeam || selectedTeam._id !== foundTeam._id)) {
                    setSelectedTeam(foundTeam);
                    if (userId) {
                        // Keep selectedMember syncing logic below happy
                    } else {
                        setSelectedMember(null);
                    }
                }
            } else if (!teamId && teams.length > 0) {
                navigate('/attendance/teams/' + teams[0]._id, { replace: true });
            }
        }
    }, [teamId, teams]);

    useEffect(() => {
        if (selectedTeam && teamMembers.length > 0) {
            if (userId) {
                const foundMember = teamMembers.find(m => m.username === userId);
                if (foundMember && (!selectedMember || selectedMember.username !== foundMember.username)) {
                    setSelectedMember(foundMember);
                    if(activeTab === 'Members') setActiveTab('Profile');
                }
            } else {
                if(selectedMember) setSelectedMember(null);
            }
        }
    }, [userId, teamMembers, selectedTeam]);

    // Fetch team members when team is selected

    useEffect(() => {
        if (selectedTeam) {
            fetchTeamMembers();
        }
    }, [selectedTeam]);

    const fetchTeamMembers = async () => {
        if (!selectedTeam) return;
        setLoadingMembers(true);
        try {
            const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/teams/${selectedTeam._id}`
            );
            if (res.data.success) {
                // Fetch full user details for members
                const memberUsernames = res.data.team.members.map(m => m.username);
                if (memberUsernames.length > 0) {
                    // For admin, use enriched data if available, otherwise fetch from team's HOD endpoint
                    if (user?.role === 'Admin' && selectedTeam.membersDetails) {
                        // Use pre-fetched member details from all teams API
                        setTeamMembers(selectedTeam.membersDetails);
                    } else if (user?.role === 'Admin') {
                        // Fetch member details directly for admin
                        const usersRes = await axios.post(
                            `${process.env.REACT_APP_API_STRING}/get-users-by-usernames`,
                            { usernames: memberUsernames }
                        );
                        if (usersRes.data) {
                            setTeamMembers(usersRes.data);
                        } else {
                            setTeamMembers([]);
                        }
                    } else {
                        // For HOD, use the existing endpoint
                        const usersRes = await axios.get(
                            `${process.env.REACT_APP_API_STRING}/teams/hod/${user.username}/members`
                        );
                        if (usersRes.data.success) {
                            // Filter to only show members of this team
                            const filteredMembers = usersRes.data.members.filter(m =>
                                memberUsernames.includes(m.username)
                            );
                            setTeamMembers(filteredMembers);
                        }
                    }
                } else {
                    setTeamMembers([]);
                }
            }
        } catch (error) {
            console.error("Error fetching team members:", error);
            message.error("Failed to fetch team members");
        } finally {
            setLoadingMembers(false);
        }
    };

    const fetchAvailableUsers = async () => {
        try {
            const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/teams/hod/${user.username}/available-users`
            );
            if (res.data.success) {
                setAvailableUsers(res.data.users);
            }
        } catch (error) {
            console.error("Error fetching available users:", error);
        }
    };

    const handleCreateTeam = async (values) => {
        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_STRING}/teams`,
                {
                    ...values,
                    hodUsername: user.username,
                }
            );
            if (res.data.success) {
                message.success("Team created successfully");
                setCreateTeamModal(false);
                form.resetFields();
                fetchTeams();
            }
        } catch (error) {
            console.error("Error creating team:", error);
            message.error(error.response?.data?.message || "Failed to create team");
        }
    };

    const handleEditTeam = async (values) => {
        try {
            const res = await axios.put(
                `${process.env.REACT_APP_API_STRING}/teams/${teamToEdit._id}`,
                values
            );
            if (res.data.success) {
                message.success("Team updated successfully");
                setEditTeamModal(false);
                editForm.resetFields();
                setTeamToEdit(null);
                fetchTeams();
                // Update selected team if it was edited
                if (selectedTeam?._id === teamToEdit._id) {
                    setSelectedTeam(res.data.team);
                }
            }
        } catch (error) {
            console.error("Error updating team:", error);
            message.error(error.response?.data?.message || "Failed to update team");
        }
    };

    const handleDeleteTeam = async (teamId) => {
        try {
            const res = await axios.delete(
                `${process.env.REACT_APP_API_STRING}/teams/${teamId}`
            );
            if (res.data.success) {
                message.success("Team deleted successfully");
                fetchTeams();
                if (selectedTeam?._id === teamId) {
                    setSelectedTeam(null);
                    setTeamMembers([]);
                }
            }
        } catch (error) {
            console.error("Error deleting team:", error);
            message.error("Failed to delete team");
        }
    };

    const handleAddMembers = async (selectedUsernames) => {
        if (!selectedTeam || selectedUsernames.length === 0) return;
        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_STRING}/teams/${selectedTeam._id}/members`,
                { usernames: selectedUsernames }
            );
            if (res.data.success) {
                message.success(res.data.message);
                setAddMembersModal(false);
                fetchTeamMembers();
                fetchAvailableUsers();
            }
        } catch (error) {
            console.error("Error adding members:", error);
            message.error(error.response?.data?.message || "Failed to add members");
        }
    };

    const handleRemoveMember = async (username) => {
        if (!selectedTeam) return;
        try {
            const res = await axios.delete(
                `${process.env.REACT_APP_API_STRING}/teams/${selectedTeam._id}/members/${username}`
            );
            if (res.data.success) {
                message.success("Member removed successfully");
                fetchTeamMembers();
            }
        } catch (error) {
            console.error("Error removing member:", error);
            message.error("Failed to remove member");
        }
    };

    

    const openEditModal = (team) => {
        setTeamToEdit(team);
        editForm.setFieldsValue({
            name: team.name,
            description: team.description,
            department: team.department,
            hodUsername: team.hodUsername
        });
        setEditTeamModal(true);
    };

    const filteredMembers = teamMembers.filter(member => {
        const term = searchTerm.toLowerCase();
        const username = member.username ? member.username.toLowerCase() : "";
        const firstName = member.first_name ? member.first_name.toLowerCase() : "";
        const lastName = member.last_name ? member.last_name.toLowerCase() : "";
        return username.includes(term) || firstName.includes(term) || lastName.includes(term);
    });

    const memberColumns = [
        {
            title: "User",
            key: "user",
            render: (_, record) => (
                <Space>
                    <Avatar src={record.employee_photo} icon={<UserOutlined />} />
                    <div>
                        <Text strong>
                            {record.first_name && record.last_name
                                ? `${record.first_name} ${record.last_name}`
                                : record.username}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.username}
                        </Text>
                    </div>
                </Space>
            ),
        },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
            render: (role) => <Tag color="blue">{role || "User"}</Tag>,
        },
        {
            title: "Department",
            dataIndex: "department",
            key: "department",
            render: (dept) => {
                if (!dept) return "-";
                return <Tag color="cyan">{dept}</Tag>;
            },
        },
        {
            title: "Status",
            key: "status",
            render: (_, record) => (
                <Badge
                    status={record.isActive !== false ? "success" : "default"}
                    text={record.isActive !== false ? "Active" : "Inactive"}
                />
            ),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Space>
                    
                    <Popconfirm
                        title="Remove this member from team?"
                        onConfirm={() => handleRemoveMember(record.username)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="link" danger size="small">
                            Remove
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const openMembersInUsersTab = () => {
        const userIds = teamMembers.map((member) => member.userId || member._id).filter(Boolean);
        setTeamShortcutUserIds(userIds);
        setModuleTab("users");
    };

    const tabItems = [
        {
            key: "Members",
            label: "Team Members",
            children: (
                <div>
                    <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="Search members..."
                            style={{ width: 300 }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Button
                            type="primary"
                            icon={<UserAddOutlined />}
                            onClick={() => {
                                fetchAvailableUsers();
                                setAddMembersModal(true);
                            }}
                        >
                            Add Members
                        </Button>
                    </div>
                    <Table
                        columns={memberColumns}
                        dataSource={filteredMembers}
                        rowKey="_id"
                        loading={loadingMembers}
                        pagination={{ pageSize: 10 }}
                        onRow={(record) => ({
                            onClick: () => navigate('/attendance/teams/' + selectedTeam._id + '/user/' + record.username + '/performance'),
                            style: {
                                cursor: "pointer",
                                background: selectedMember?._id === record._id ? "#e6f7ff" : undefined,
                            },
                        })}
                    />
                </div>
            ),
        },
    ];

    // Add member-specific tabs when a member is selected
    if (selectedMember) {
        tabItems.push(
            {
                key: "Profile",
                label: `Profile (${selectedMember.username})`,
                children: (
                    <Card bordered={false} bodyStyle={{ padding: 0 }}>
                        <EmployeeProfileWorkspace
                            employeeId={selectedMember.userId || selectedMember._id}
                            username={selectedMember.username}
                        />
                    </Card>
                ),
            },
            {
                key: "Assign Department",
                label: `Department (${selectedMember.username})`,
                children: (
                    <Card bordered={false}>
                        <AssignDepartment selectedUser={selectedMember.username} />
                    </Card>
                ),
            }
        );
    }

    const toggleButtons = (
        <Space>
            <Button
                type={moduleTab === "users" ? "primary" : "default"}
                icon={<UserOutlined />}
                onClick={() => setModuleTab("users")}
            >
                Users
            </Button>
            <Button
                type={moduleTab === "teams" ? "primary" : "default"}
                icon={<TeamOutlined />}
                onClick={() => setModuleTab("teams")}
            >
                Teams
            </Button>
        </Space>
    );

    return (
        <div style={{ minHeight: "calc(100vh - 64px)", background: "#f0f2f5", padding: 16 }}>
            {moduleTab === "users" ? (
                <div style={{ background: '#fff', borderRadius: '8px' }}>
                    <EmployeeProfileWorkspace 
                        preselectedEmployeeIds={teamShortcutUserIds} 
                        headerActions={toggleButtons} 
                    />
                </div>
            ) : (
                <Layout style={{ minHeight: "calc(100vh - 160px)", background: "#f0f2f5" }}>
            <Sider width={320} theme="light" style={{ borderRight: "1px solid #e8e8e8", height: "calc(100vh - 64px)" }}>
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ padding: 16, borderBottom: "1px solid #e8e8e8", flexShrink: 0 }}>
                        <div style={{ marginBottom: 16 }}>
                            {toggleButtons}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <Title level={4} style={{ margin: 0 }}>
                                <TeamOutlined style={{ marginRight: 8 }} />
                                My Teams
                            </Title>
                            <Tooltip title="Create New Team">
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    size="small"
                                    onClick={() => setCreateTeamModal(true)}
                                />
                            </Tooltip>
                        </div>
                        <Text type="secondary">
                            Manage your teams and team members
                        </Text>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto" }}>
                        {loading ? (
                            <div style={{ padding: 20, textAlign: "center" }}>
                                <Spin />
                            </div>
                        ) : teams.length > 0 ? (
                            teams.map((team) => (
                                <div
                                    key={team._id}
                                    onClick={() => { navigate('/attendance/teams/' + team._id); }}
                                    style={{
                                        padding: "12px 16px",
                                        cursor: "pointer",
                                        background: selectedTeam?._id === team._id ? "#e6f7ff" : "transparent",
                                        borderRight: selectedTeam?._id === team._id ? "3px solid #1890ff" : "none",
                                        borderBottom: "1px solid #f0f0f0",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div style={{ flex: 1 }}>
                                            <Text strong style={{ fontSize: 14 }}>{team.name}</Text>
                                            {team.department && (
                                                <Tag size="small" style={{ marginLeft: 8 }}>{team.department}</Tag>
                                            )}
                                            <br />
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {team.members?.length || 0} members
                                            </Text>
                                            {/* Show HOD name */}
                                            {(team.hodDetails || team.hodUsername) && (
                                                <>
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 11, color: '#1890ff' }}>
                                                        HOD: {team.hodDetails
                                                            ? `${team.hodDetails.first_name} ${team.hodDetails.last_name}`
                                                            : team.hodUsername}
                                                    </Text>
                                                </>
                                            )}
                                            {team.description && (
                                                <>
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                                                        {team.description}
                                                    </Text>
                                                </>
                                            )}
                                        </div>
                                        <Space size="small">
                                            <Tooltip title="Edit Team">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(team);
                                                    }}
                                                />
                                            </Tooltip>
                                            <Popconfirm
                                                title="Delete this team?"
                                                description="All team associations will be removed."
                                                onConfirm={(e) => {
                                                    e?.stopPropagation();
                                                    handleDeleteTeam(team._id);
                                                }}
                                                onCancel={(e) => e?.stopPropagation()}
                                                okText="Yes"
                                                cancelText="No"
                                            >
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </Popconfirm>
                                        </Space>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <Empty
                                description="No teams created yet"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                style={{ margin: "40px 0" }}
                            >
                                <Button type="primary" onClick={() => setCreateTeamModal(true)}>
                                    Create Your First Team
                                </Button>
                            </Empty>
                        )}
                    </div>
                </div>
            </Sider>

            <Content style={{ padding: 24 }}>
                {selectedTeam ? (
                    <Space direction="vertical" size="large" style={{ width: "100%" }}>
                        <Card bordered={false}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Space size="middle">
                                    <Avatar
                                        size={64}
                                        style={{ backgroundColor: "#1890ff" }}
                                        icon={<TeamOutlined />}
                                    />
                                    <div>
                                        <Title level={3} style={{ margin: 0 }}>{selectedTeam.name}</Title>
                                        <Space split={<Divider type="vertical" />}>
                                            {selectedTeam.department && (
                                                <Text type="secondary">{selectedTeam.department}</Text>
                                            )}
                                            <Text type="secondary">
                                                {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
                                            </Text>
                                            {/* Show HOD name */}
                                            {(selectedTeam.hodDetails || selectedTeam.hodUsername) && (
                                                <Text type="secondary" style={{ color: '#1890ff' }}>
                                                    HOD: {selectedTeam.hodDetails
                                                        ? `${selectedTeam.hodDetails.first_name} ${selectedTeam.hodDetails.last_name}`
                                                        : selectedTeam.hodUsername}
                                                </Text>
                                            )}
                                        </Space>
                                        {selectedTeam.description && (
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {selectedTeam.description}
                                                </Text>
                                            </div>
                                        )}
                                    </div>
                                </Space>
                                <Button type="default" onClick={openMembersInUsersTab}>
                                    Manage Members in Users Tab
                                </Button>
                            </div>
                        </Card>

                        <Card bordered={false} bodyStyle={{ padding: 0 }}>
                            <Tabs
                                activeKey={activeTab}
                                onChange={(key) => {
                                      setActiveTab(key);
                                      if (key === "Members") {
                                          navigate('/attendance/teams/' + selectedTeam._id);
                                          setSelectedMember(null);
                                      }
                                  }}
                                items={tabItems}
                                size="large"
                                tabPosition="top"
                                type="card"
                                style={{ padding: "0 0 24px 0" }}
                                tabBarStyle={{
                                    margin: 0,
                                    padding: "16px 16px 0 16px",
                                    background: "#fafafa",
                                    borderBottom: "1px solid #e8e8e8",
                                }}
                            />
                        </Card>
                    </Space>
                ) : (
                    <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Select a team from the sidebar or create a new one"
                        />
                    </div>
                )}
            </Content>

            {/* Create Team Modal */}
            <Modal
                title="Create New Team"
                open={createTeamModal}
                onCancel={() => {
                    setCreateTeamModal(false);
                    form.resetFields();
                }}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleCreateTeam}>
                    <Form.Item
                        name="name"
                        label="Team Name"
                        rules={[{ required: true, message: "Please enter team name" }]}
                    >
                        <Input placeholder="e.g., Export Team, Documentation Team" />
                    </Form.Item>
                    <Form.Item
                        name="department"
                        label="Department"
                    >
                        <AutoComplete
                            options={[
                                { value: "Export" },
                                { value: "Import" },
                                { value: "Operation-Khodiyar" },
                                { value: "Operation-Sanand" },
                                { value: "Feild" },
                                { value: "Accounts" },
                                { value: "SRCC" },
                                { value: "Gandhidham" },
                                { value: "DGFT" },
                                { value: "Software" },
                                { value: "Marketing" },
                                { value: "Paramount" },
                                { value: "Rabs" },
                                { value: "Admin" }
                            ]}
                            placeholder="Select or enter custom department"
                            filterOption={(inputValue, option) =>
                                option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                            allowClear
                        />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea placeholder="Brief description of the team" rows={3} />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
                        <Space>
                            <Button onClick={() => {
                                setCreateTeamModal(false);
                                form.resetFields();
                            }}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Create Team
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Team Modal */}
            <Modal
                title="Edit Team"
                open={editTeamModal}
                onCancel={() => {
                    setEditTeamModal(false);
                    editForm.resetFields();
                    setTeamToEdit(null);
                }}
                footer={null}
                destroyOnClose
            >
                <Form form={editForm} layout="vertical" onFinish={handleEditTeam}>
                    <Form.Item
                        name="name"
                        label="Team Name"
                        rules={[{ required: true, message: "Please enter team name" }]}
                    >
                        <Input placeholder="e.g., Export Team, Documentation Team" />
                    </Form.Item>
                    <Form.Item
                        name="department"
                        label="Department"
                    >
                        <AutoComplete
                            options={[
                                { value: "Export" },
                                { value: "Import" },
                                { value: "Operation-Khodiyar" },
                                { value: "Operation-Sanand" },
                                { value: "Feild" },
                                { value: "Accounts" },
                                { value: "SRCC" },
                                { value: "Gandhidham" },
                                { value: "DGFT" },
                                { value: "Software" },
                                { value: "Marketing" },
                                { value: "Paramount" },
                                { value: "Rabs" },
                                { value: "Admin" }
                            ]}
                            placeholder="Select or enter custom department"
                            filterOption={(inputValue, option) =>
                                option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                            allowClear
                        />
                    </Form.Item>
                    {user?.role === 'Admin' && (
                        <Form.Item
                            name="hodUsername"
                            label="Team HOD"
                            rules={[{ required: true, message: "Please select a HOD" }]}
                        >
                            <Select
                                showSearch
                                placeholder="Select a HOD"
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {allUsers
                                    .filter(u => u.isActive !== false && (u.role === 'Admin' || u.role === 'Head_of_Department'))
                                    .map(u => (
                                        <Option key={u._id} value={u.username} label={`${u.first_name || ''} ${u.last_name || ''} (${u.username})`}>
                                            {u.first_name} {u.last_name} ({u.username})
                                        </Option>
                                    ))}
                            </Select>
                        </Form.Item>
                    )}
                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea placeholder="Brief description of the team" rows={3} />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
                        <Space>
                            <Button onClick={() => {
                                setEditTeamModal(false);
                                editForm.resetFields();
                                setTeamToEdit(null);
                            }}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Update Team
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Add Members Modal */}
            <AddMembersModal
                open={addMembersModal}
                onClose={() => setAddMembersModal(false)}
                availableUsers={availableUsers}
                onAdd={handleAddMembers}
                teamName={selectedTeam?.name}
            />

            
        </Layout>
            )}
        </div>
    );
}

// Separate component for Add Members Modal with Transfer
function AddMembersModal({ open, onClose, availableUsers, onAdd, teamName }) {
    const [targetKeys, setTargetKeys] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleChange = (nextTargetKeys) => {
        setTargetKeys(nextTargetKeys);
    };

    const handleSubmit = async () => {
        if (targetKeys.length === 0) {
            message.warning("Please select at least one user to add");
            return;
        }
        setLoading(true);
        await onAdd(targetKeys);
        setLoading(false);
        setTargetKeys([]);
    };

    const filterOption = (inputValue, option) =>
        (option.title || "").toLowerCase().indexOf((inputValue || "").toLowerCase()) > -1;

    const dataSource = availableUsers.map(user => ({
        key: user.username,
        title: user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name} (${user.username})`
            : user.username,
        description: user.department || user.role || "",
    }));

    return (
        <Modal
            title={`Add Members to ${teamName || "Team"}`}
            open={open}
            onCancel={() => {
                onClose();
                setTargetKeys([]);
            }}
            width={700}
            footer={[
                <Button key="cancel" onClick={() => {
                    onClose();
                    setTargetKeys([]);
                }}>
                    Cancel
                </Button>,
                <Button
                    key="add"
                    type="primary"
                    loading={loading}
                    onClick={handleSubmit}
                    disabled={targetKeys.length === 0}
                >
                    Add {targetKeys.length > 0 ? `(${targetKeys.length})` : ""} Members
                </Button>,
            ]}
            destroyOnClose
        >
            <Transfer
                dataSource={dataSource}
                showSearch
                filterOption={filterOption}
                targetKeys={targetKeys}
                onChange={handleChange}
                render={item => item.title}
                listStyle={{
                    width: "46%",
                    height: 400,
                }}
                titles={["Available Users", "Selected"]}
            />
        </Modal>
    );
}

export default React.memo(TeamDashboard);
