import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Select,
    Button,
    Card,
    Typography,
    Space,
    Table,
    Popconfirm,
    message,
    Spin,
    Divider
} from "antd";
import { EnvironmentOutlined, DeleteOutlined } from "@ant-design/icons";

const { Option } = Select;
const { Title, Text } = Typography;

function AssignBranch({ selectedUser }) {
    const [branches, setBranches] = useState([]);
    const [assignedBranches, setAssignedBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);

    // Form state
    const [selectedBranchId, setSelectedBranchId] = useState(null);

    useEffect(() => {
        if (selectedUser) {
            fetchBranches();
            fetchUserBranches();
        }
    }, [selectedUser]);

    const fetchBranches = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/get-branches`, { withCredentials: true });
            setBranches(response.data || []);
        } catch (error) {
            console.error("Error fetching branches:", error);
            message.error("Failed to fetch branches");
        }
    };

    const fetchUserBranches = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/user-branches/${selectedUser}`, { withCredentials: true });
            setAssignedBranches(response.data || []);
        } catch (error) {
            console.error("Error fetching user branches:", error);
            message.error("Failed to fetch user assignments");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedBranchId) {
            message.warning("Please select a branch first");
            return;
        }

        setAssigning(true);
        try {
            await axios.post(`${process.env.REACT_APP_API_STRING}/admin/assign-branch`, {
                user_id: selectedUser,
                branch_id: selectedBranchId
            }, { withCredentials: true });
            message.success("Branch assigned successfully");
            setSelectedBranchId(null);
            fetchUserBranches();
        } catch (error) {
            console.error("Error assigning branch:", error);
            message.error(error.response?.data?.error || "Failed to assign branch");
        } finally {
            setAssigning(false);
        }
    };

    const handleAssignAll = async () => {
        if (!selectedBranchId) {
            message.warning("Please select a branch first");
            return;
        }

        setAssigning(true);
        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_STRING}/admin/assign-branch-to-all`,
                { branch_id: selectedBranchId },
                { withCredentials: true }
            );
            message.success(res.data.message || "Branch assigned to all users");
            fetchUserBranches();
        } catch (error) {
            console.error("Error assigning branch to all users:", error);
            message.error(error.response?.data?.error || "Failed to assign branch to all users");
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassign = async (userBranchId) => {
        try {
            await axios.delete(`${process.env.REACT_APP_API_STRING}/admin/unassign-branch/${userBranchId}`, { withCredentials: true });
            message.success("Branch unassigned successfully");
            fetchUserBranches();
        } catch (error) {
            console.error("Error unassigning branch:", error);
            message.error("Failed to unassign branch");
        }
    };

    const columns = [
        {
            title: "Branch Code",
            dataIndex: ["branch_id", "branch_code"],
            key: "code",
        },
        {
            title: "Branch Name",
            dataIndex: ["branch_id", "branch_name"],
            key: "name",
        },
        {
            title: "Category",
            dataIndex: ["branch_id", "category"],
            key: "category",
            render: (category) => (
                <Text strong>{category}</Text>
            )
        },
        {
            title: "Action",
            key: "action",
            render: (_, record) => (
                <Popconfirm
                    title="Are you sure you want to unassign this branch?"
                    onConfirm={() => handleUnassign(record._id)}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    return (
        <Card title={`Manage Branch Access for ${selectedUser}`} bordered={false}>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>Select Branch & Category</Text>
                        <Select
                            showSearch
                            style={{ width: '100%' }}
                            placeholder="Search and select branch (e.g. Mundra SEA)"
                            optionFilterProp="children"
                            value={selectedBranchId}
                            onChange={(value) => setSelectedBranchId(value)}
                        >
                            {branches.map(b => (
                                <Option key={b._id} value={b._id}>
                                    {b.branch_name} ({b.branch_code}) - {b.category}
                                </Option>
                            ))}
                        </Select>
                    </div>
                    <Space>
                        <Popconfirm
                            title="Assign this branch to all users?"
                            onConfirm={handleAssignAll}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button loading={assigning}>
                                Assign To All
                            </Button>
                        </Popconfirm>
                        <Button
                            type="primary"
                            icon={<EnvironmentOutlined />}
                            onClick={handleAssign}
                            loading={assigning}
                        >
                            Assign Branch
                        </Button>
                    </Space>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <Title level={5}>Assigned Branches</Title>
                <Table
                    dataSource={assignedBranches}
                    columns={columns}
                    rowKey="_id"
                    loading={loading}
                    size="small"
                    pagination={false}
                />
            </Space>
        </Card>
    );
}

export default React.memo(AssignBranch);
