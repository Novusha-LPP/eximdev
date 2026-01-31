import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import {
    Form,
    Select,
    Button,
    Card,
    Alert,
    Spin,
    Space,
    Tag,
    message,
    Popconfirm
} from "antd";
import { UserContext } from "../../../contexts/UserContext";

const { Option } = Select;

function AssignDepartment({ selectedUser }) {
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    const { user } = useContext(UserContext);
    const [form] = Form.useForm();

    // Department options
    const departmentOptions = [
        "Export",
        "Import",
        "Operation-Khodiyar",
        "Operation-Sanand",
        "Feild",
        "Accounts",
        "SRCC",
        "Gandhidham",
        "DGFT",
        "Software",
        "Marketing",
        "Paramount",
        "Rabs"
    ];

    useEffect(() => {
        // Reset form when selected user changes
        setSelectedDepartment(null);
        form.resetFields();

        // Fetch user data to check current Department assignment
        if (selectedUser) {
            fetchUserData();
        }
    }, [selectedUser, form]);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/get-user/${selectedUser}`
            );
            setUserData(res.data);

            // Set current Department
            const currentDepartment = res.data.department || null;

            setSelectedDepartment(currentDepartment);
            form.setFieldsValue({ department: currentDepartment });
        } catch (error) {
            console.error("Error fetching user data:", error);
            message.error("Error fetching user information");
        } finally {
            setLoading(false);
        }
    };

    const onFinish = async (values) => {
        const dept = values.department;

        // Check if current user has permissions
        const allowedRoles = ["Admin", "Head_of_Department"];
        if (!allowedRoles.includes(user.role)) {
            message.error("Only Admins or HODs can assign departments");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_STRING}/admin/assign-department`,
                {
                    username: selectedUser,
                    selectedDepartment: dept,
                    adminUsername: user.username
                }
            );

            message.success(response.data.message || "Department assigned successfully");

            // Update local user data to reflect the change
            setUserData(prev => ({
                ...prev,
                department: dept
            }));

        } catch (error) {
            console.error("Error assigning department:", error);

            if (error.response?.status === 403) {
                message.error(error.response.data.message || "Unauthorized action");
            } else if (error.response?.status === 404) {
                message.error("User not found");
            } else {
                message.error(error.response?.data?.message || "Error assigning department");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveDepartment = async () => {
        if (!userData?.department) {
            message.warning("No department assigned to remove");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_STRING}/admin/remove-department`,
                {
                    username: selectedUser,
                    adminUsername: user.username
                }
            );

            message.success(response.data.message || "Department removed successfully");
            setSelectedDepartment(null);
            form.setFieldsValue({ department: null });

            // Update local user data
            setUserData(prev => ({
                ...prev,
                department: null
            }));

        } catch (error) {
            console.error("Error removing department:", error);
            message.error(error.response?.data?.message || "Error removing department");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title={`Assign Department for ${selectedUser}`} bordered={false}>
            <Spin spinning={loading}>
                <Space direction="vertical" style={{ width: "100%" }} size="middle">

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {selectedUser && (
                            <Button onClick={fetchUserData} loading={loading}>
                                Refresh Data
                            </Button>
                        )}
                    </div>

                    {/* Display current Department assignments */}
                    {userData?.department ? (
                        <Alert
                            message={`Currently Assigned Department`}
                            description={
                                <div style={{ marginTop: 8 }}>
                                    <Tag color="blue">{userData.department}</Tag>
                                </div>
                            }
                            type="info"
                            showIcon
                        />
                    ) : (
                        <Alert
                            message="No Department Assigned"
                            description={`No department is currently assigned to ${userData?.username || selectedUser}. Use the form below to assign.`}
                            type="warning"
                            showIcon
                        />
                    )}

                    {!["Admin", "Head_of_Department"].includes(user.role) ? (
                        <Alert message="Only administrators or HODs can assign departments to users" type="error" showIcon />
                    ) : (
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            initialValues={{ department: selectedDepartment }}
                        >
                            <Form.Item
                                name="department"
                                label="Select Department"
                                rules={[{ required: true, message: 'Please select a department' }]}
                            >
                                <Select
                                    placeholder="Select Department"
                                    style={{ width: '100%' }}
                                    onChange={setSelectedDepartment}
                                    optionFilterProp="children"
                                >
                                    {departmentOptions.map((dept) => (
                                        <Option key={dept} value={dept}>{dept}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item>
                                <Space>
                                    <Button type="primary" htmlType="submit" loading={loading}>
                                        Assign Department
                                    </Button>

                                    {/* Show Remove button if there is a department assigned */}
                                    {userData?.department && (
                                        <Popconfirm
                                            title="Are you sure remove the assigned department?"
                                            onConfirm={handleRemoveDepartment}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                            <Button danger loading={loading}>
                                                Remove
                                            </Button>
                                        </Popconfirm>
                                    )}
                                </Space>
                            </Form.Item>
                        </Form>
                    )}
                </Space>
            </Spin>
        </Card>
    );
}

export default AssignDepartment;
