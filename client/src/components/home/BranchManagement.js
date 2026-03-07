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
import { PlusOutlined, EditOutlined, MinusCircleOutlined } from "@ant-design/icons";
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
        setIsModalVisible(true);
        setTimeout(() => {
            if (branch) {
                form.setFieldsValue(branch);
            } else {
                form.resetFields();
                form.setFieldsValue({ isActive: true, categories: ["SEA"] });
            }
        }, 0);
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
            title: "SEA Behavior",
            dataIndex: "sea_behavior",
            key: "sea_behavior",
            render: (behavior, record) => record.categories.includes("SEA") ? behavior : "-",
        },
        {
            title: "SEA ICDs",
            dataIndex: "sea_icd_list",
            key: "sea_icd_list",
            render: (icds) => (icds && icds.length > 0 ? icds.map(icd => `${icd.icd_name} (${icd.port_code})`).join(", ") : "-"),
        },
        {
            title: "AIR ICDs",
            dataIndex: "air_icd_list",
            key: "air_icd_list",
            render: (icds) => (icds && icds.length > 0 ? icds.map(icd => `${icd.icd_name} (${icd.port_code})`).join(", ") : "-"),
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
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.categories !== currentValues.categories}
                    >
                        {({ getFieldValue }) =>
                            getFieldValue('categories')?.includes('SEA') ? (
                                <Form.Item
                                    name="sea_behavior"
                                    label="SEA Behavior Selection"
                                    rules={[{ required: true, message: "Please select SEA behavior type" }]}
                                    initialValue="Other SEA"
                                >
                                    <Select placeholder="Select behavior">
                                        <Option value="HO SEA">HO SEA (Ahmedabad Behaviour)</Option>
                                        <Option value="Other SEA">Other SEA (Non-HO Behaviour)</Option>
                                    </Select>
                                </Form.Item>
                            ) : null
                        }
                    </Form.Item>

                    {/* SEA Ports Section */}
                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.categories !== currentValues.categories}
                    >
                        {({ getFieldValue }) =>
                            getFieldValue('categories')?.includes('SEA') ? (
                                <Card size="small" title="SEA Configured Ports" style={{ marginBottom: 16 }}>
                                    <Form.List name="sea_icd_list">
                                        {(fields, { add, remove }) => (
                                            <>
                                                {fields.map(({ key, name, ...restField }) => (
                                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'icd_name']}
                                                            rules={[{ required: true, message: 'Missing ICD Name' }]}
                                                        >
                                                            <Input placeholder="ICD Name" />
                                                        </Form.Item>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'port_code']}
                                                            rules={[{ required: true, message: 'Missing Port Code' }]}
                                                        >
                                                            <Input placeholder="Port Code" />
                                                        </Form.Item>
                                                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                                                    </Space>
                                                ))}
                                                <Form.Item>
                                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                                        Add SEA Port
                                                    </Button>
                                                </Form.Item>
                                            </>
                                        )}
                                    </Form.List>
                                </Card>
                            ) : null
                        }
                    </Form.Item>

                    {/* AIR Ports Section */}
                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.categories !== currentValues.categories}
                    >
                        {({ getFieldValue }) =>
                            getFieldValue('categories')?.includes('AIR') ? (
                                <Card size="small" title="AIR Configured Ports" style={{ marginBottom: 16 }}>
                                    <Form.List name="air_icd_list">
                                        {(fields, { add, remove }) => (
                                            <>
                                                {fields.map(({ key, name, ...restField }) => (
                                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'icd_name']}
                                                            rules={[{ required: true, message: 'Missing ICD Name' }]}
                                                        >
                                                            <Input placeholder="Airport Name" />
                                                        </Form.Item>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'port_code']}
                                                            rules={[{ required: true, message: 'Missing Port Code' }]}
                                                        >
                                                            <Input placeholder="Port Code" />
                                                        </Form.Item>
                                                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                                                    </Space>
                                                ))}
                                                <Form.Item>
                                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                                        Add AIR Port
                                                    </Button>
                                                </Form.Item>
                                            </>
                                        )}
                                    </Form.List>
                                </Card>
                            ) : null
                        }
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
        </div >
    );
}

export default React.memo(BranchManagement);
