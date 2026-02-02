import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
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
    Spin
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
import AssignModule from "./AssignModule";
import ChangePasswordByAdmin from "./AssignRole/ChangePasswordByAdmin";
import SelectIcdCode from "./AssignRole/SelectIcdCode";
import AssignDepartment from "./AssignRole/AssignDepartment";
import UserDetails from "./AssignRole/UserDetails";
import UserProfile from "../userProfile/UserProfile";

const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const { Option } = Select;

function HodManagement() {
    const { user } = useContext(UserContext);
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
    const [activeTab, setActiveTab] = useState("Members");
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [profileUser, setProfileUser] = useState(null);
    const [editTeamModal, setEditTeamModal] = useState(false);
    const [teamToEdit, setTeamToEdit] = useState(null);
    const [hodModules, setHodModules] = useState([]); // HOD's assigned modules
    const [allUsers, setAllUsers] = useState([]); // All users for Admin to select HOD

    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

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

    const handleViewProfile = (username) => {
        setProfileUser(username);
        setProfileModalVisible(true);
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
                    <Button
                        type="link"
                        size="small"
                        onClick={() => {
                            setSelectedMember(record);
                            setActiveTab("Members");
                        }}
                    >
                        Manage
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => handleViewProfile(record.username)}
                    >
                        Profile
                    </Button>
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
                            onClick: () => setSelectedMember(record),
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
                key: "Assign Module",
                label: `Modules (${selectedMember.username})`,
                children: <AssignModule selectedUser={selectedMember.username} allowedModules={hodModules} />,
            },
            {
                key: "Change Password",
                label: `Password (${selectedMember.username})`,
                children: <ChangePasswordByAdmin selectedUser={selectedMember.username} />,
            },
            {
                key: "Assign ICD",
                label: `ICD Code (${selectedMember.username})`,
                children: <SelectIcdCode selectedUser={selectedMember.username} />,
            },
            {
                key: "Assign Department",
                label: `Department (${selectedMember.username})`, // Singular label
                children: (
                    <Card bordered={false}>
                        <AssignDepartment selectedUser={selectedMember.username} />
                    </Card>
                ),
            },
            {
                key: "Assign Importers",
                label: `Importers (${selectedMember.username})`,
                children: (
                    <Card bordered={false}>
                        <UserDetails
                            selectedUser={selectedMember}
                            onSave={() => fetchTeamMembers()}
                        />
                    </Card>
                ),
            }
        );
    }

    return (
        <Layout style={{ minHeight: "calc(100vh - 64px)", background: "#f0f2f5" }}>
            <Sider width={320} theme="light" style={{ borderRight: "1px solid #e8e8e8", height: "calc(100vh - 64px)" }}>
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ padding: 16, borderBottom: "1px solid #e8e8e8", flexShrink: 0 }}>
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
                                    onClick={() => {
                                        setSelectedTeam(team);
                                        setSelectedMember(null);
                                    }}
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
                                            {/* Show HOD name for admin view */}
                                            {user?.role === 'Admin' && (team.hodDetails || team.hodUsername) && (
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
                            </div>
                        </Card>

                        <Card bordered={false} bodyStyle={{ padding: 0 }}>
                            <Tabs
                                activeKey={activeTab}
                                onChange={(key) => {
                                    setActiveTab(key);
                                    if (key === "Members") {
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
                        <Select placeholder="Select department" allowClear>
                            <Option value="Export">Export</Option>
                            <Option value="Import">Import</Option>
                            <Option value="Operation-Khodiyar">Operation-Khodiyar</Option>
                            <Option value="Operation-Sanand">Operation-Sanand</Option>
                            <Option value="Feild">Feild</Option>
                            <Option value="Accounts">Accounts</Option>
                            <Option value="SRCC">SRCC</Option>
                            <Option value="Gandhidham">Gandhidham</Option>
                            <Option value="DGFT">DGFT</Option>
                            <Option value="Software">Software</Option>
                            <Option value="Marketing">Marketing</Option>
                            <Option value="Paramount">Paramount</Option>
                            <Option value="Rabs">Rabs</Option>
                        </Select>
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
                        <Select placeholder="Select department" allowClear>
                            <Option value="Export">Export</Option>
                            <Option value="Import">Import</Option>
                            <Option value="Operation-Khodiyar">Operation-Khodiyar</Option>
                            <Option value="Operation-Sanand">Operation-Sanand</Option>
                            <Option value="Feild">Feild</Option>
                            <Option value="Accounts">Accounts</Option>
                            <Option value="SRCC">SRCC</Option>
                            <Option value="Gandhidham">Gandhidham</Option>
                            <Option value="DGFT">DGFT</Option>
                            <Option value="Software">Software</Option>
                            <Option value="Marketing">Marketing</Option>
                            <Option value="Paramount">Paramount</Option>
                            <Option value="Rabs">Rabs</Option>
                        </Select>
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

            {/* Profile Modal */}
            <Modal
                title="User Profile"
                open={profileModalVisible}
                onCancel={() => {
                    setProfileModalVisible(false);
                    setProfileUser(null);
                }}
                footer={null}
                width={1000}
                style={{ top: 20 }}
                destroyOnClose
            >
                {profileUser && <UserProfile username={profileUser} />}
            </Modal>
        </Layout>
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

export default React.memo(HodManagement);
