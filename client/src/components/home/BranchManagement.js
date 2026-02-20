import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    Switch,
    Space,
    message,
    Card,
    Typography,
} from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;
const { Option } = Select;

function BranchManagement() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [form] = Form.useForm();

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/branches`);
            setBranches(res.data.data || []);
        } catch (error) {
            console.error("Error fetching branches:", error);
            message.error("Failed to fetch branches");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleOpenModal = (branch = null) => {
        setEditingBranch(branch);
        if (branch) {
            form.setFieldsValue(branch);
        } else {
            form.resetFields();
            form.setFieldsValue({ isActive: true, categories: ["SEA"] });
        }
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
        setEditingBranch(null);
        form.resetFields();
    };

    const handleFormSubmit = async (values) => {
        try {
            if (editingBranch) {
                // Update
                await axios.put(
                    `${process.env.REACT_APP_API_STRING}/admin/branches/${editingBranch._id}`,
                    values
                );
                message.success("Branch updated successfully");
            } else {
                // Create
                await axios.post(`${process.env.REACT_APP_API_STRING}/admin/branches`, values);
                message.success("Branch created successfully");
            }
            handleCloseModal();
            fetchBranches();
        } catch (error) {
            console.error("Error saving branch:", error);
            message.error(error.response?.data?.message || "Failed to save branch");
        }
    };

    const columns = [
        {
            title: "Branch Name",
            dataIndex: "branch_name",
            key: "branch_name",
            sorter: (a, b) => a.branch_name.localeCompare(b.branch_name),
        },
        {
            title: "Categories",
            dataIndex: "categories",
            key: "categories",
            render: (categories) => categories.join(", "),
        },
        {
            title: "ICD List",
            dataIndex: "icd_list",
            key: "icd_list",
            render: (icds) => (icds.length > 0 ? icds.join(", ") : "-"),
        },
        {
            title: "Status",
            dataIndex: "isActive",
            key: "isActive",
            render: (isActive) => (
                <span style={{ color: isActive ? "green" : "red" }}>
                    {isActive ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleOpenModal(record)}
                    >
                        Edit
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: "24px" }}>
            <Card
                title={<Title level={3}>Branch Management</Title>}
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenModal()}
                    >
                        Add Branch
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={branches}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingBranch ? "Edit Branch" : "Add Branch"}
                open={isModalVisible}
                onCancel={handleCloseModal}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFormSubmit}
                    initialValues={{ isActive: true }}
                >
                    <Form.Item
                        name="branch_name"
                        label="Branch Name"
                        rules={[{ required: true, message: "Please enter branch name" }]}
                    >
                        <Input placeholder="e.g. GANDHIDHAM" />
                    </Form.Item>

                    <Form.Item
                        name="categories"
                        label="Allowed Categories"
                        rules={[
                            { required: true, message: "Please select at least one category" },
                        ]}
                    >
                        <Select mode="multiple" placeholder="Select categories">
                            <Option value="SEA">SEA</Option>
                            <Option value="AIR">AIR</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="icd_list"
                        label="Configured ICDs"
                        help="Type an ICD name and press Enter to add."
                    >
                        <Select mode="tags" style={{ width: "100%" }} placeholder="e.g. MUNDRA, SANAND" />
                    </Form.Item>

                    <Form.Item name="isActive" label="Status" valuePropName="checked">
                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>

                    <Form.Item style={{ textAlign: "right", marginTop: 24, marginBottom: 0 }}>
                        <Space>
                            <Button onClick={handleCloseModal}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                {editingBranch ? "Update" : "Create"}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default React.memo(BranchManagement);
