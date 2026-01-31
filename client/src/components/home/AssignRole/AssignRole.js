import React, { useState } from "react";
import axios from "axios";
import {
  Form,
  Select,
  Button,
  Card,
  Table,
  Avatar,
  Tag,
  Modal,
  message,
  Space,
  Row,
  Col,
  Statistic
} from "antd";
import { UserOutlined, TeamOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import UserDetails from "./UserDetails.js";

const { Option } = Select;

function AssignRole({ selectedUser }) {
  const [form] = Form.useForm();
  const [usersByRole, setUsersByRole] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigningScore, setAssigningScore] = useState(false); // loading state for assign

  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  // Role options
  const roles = [
    "Admin",
    "Head_of_Department",
    "Sr_Manager",
    "Manager",
    "Asst_Manager",
    "Sr_Executive",
    "Executive",
    "Asst_Executive",
    "User",
  ];

  const onFinish = async (values) => {
    if (!selectedUser) {
      message.warning("Please select a user first from the main dropdown.");
      return;
    }

    setAssigningScore(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/assign-role`,
        {
          role: values.role,
          username: selectedUser,
        }
      );
      message.success(res.data.message || "Role assigned successfully");
      form.resetFields();
    } catch (error) {
      console.error("Error assigning role:", error);
      message.error("Failed to assign role. Please try again.");
    } finally {
      setAssigningScore(false);
    }
  };

  const fetchUsersByRole = async (role) => {
    if (!role) {
      setUsersByRole([]);
      return;
    }
    setLoadingUsers(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/users-by-role?role=${role}`
      );
      if (res.data.success && res.data.users.length === 0) {
        setUsersByRole([]);
        message.info(res.data.message);
      } else {
        setUsersByRole(res.data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      message.error("Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar src={record.employee_photo} icon={<UserOutlined />} />
          <span>{record.username}</span>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => <Tag color="blue">{role}</Tag>,
    },
    {
      title: 'Importers',
      key: 'importers',
      render: (_, record) => (
        <span>{record.assigned_importer_name?.length || 0} Assigned</span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => handleUserClick(record)}>
          Details
        </Button>
      ),
    },
  ];

  const handleUserClick = (user) => {
    setSelectedUserDetails(user);
    setShowUserDetails(true);
  };

  const handleUserUpdate = (updatedImporters) => {
    if (!selectedUserDetails) return;
    setUsersByRole((prev) =>
      prev.map((u) =>
        u._id === selectedUserDetails._id
          ? { ...u, assigned_importer_name: updatedImporters }
          : u
      )
    );
    // message.success("Importers updated successfully") // handled in child or here? Original handled here.
    // Actually UserDetails handles the save API, so we just update local state here
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Card title={<span><SafetyCertificateOutlined /> Assign Role to {selectedUser || "..."}</span>}>
        <Form form={form} layout="inline" onFinish={onFinish}>
          <Form.Item
            name="role"
            rules={[{ required: true, message: "Please select a role" }]}
            style={{ minWidth: 200 }}
          >
            <Select placeholder="Select Role">
              {roles.map((r) => (
                <Option key={r} value={r}>
                  {r.replace("_", ". ")}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={assigningScore} disabled={!selectedUser}>
              Update Role
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title={<span><TeamOutlined /> Browse Users by Role</span>}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Select
            placeholder="Filter by role to view users"
            style={{ width: 200 }}
            onChange={fetchUsersByRole}
            allowClear
          >
            {roles.map((r) => (
              <Option key={r} value={r}>
                {r.replace("_", ". ")}
              </Option>
            ))}
          </Select>

          <Table
            dataSource={usersByRole}
            columns={columns}
            rowKey="_id"
            loading={loadingUsers}
            pagination={{ pageSize: 5 }}
          />
        </Space>
      </Card>

      {/* Reusing existing UserDetails logic but wrapped differently if needed, 
          or we assume UserDetails renders its own modal? 
          Original code: rendered UpdateDetails INSTEAD of the form.
          Let's make it a Modal for better UX. */}

      <Modal
        title={`Details for ${selectedUserDetails?.username}`}
        open={showUserDetails}
        onCancel={() => setShowUserDetails(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {selectedUserDetails && (
          <UserDetails
            selectedUser={selectedUserDetails}
            onClose={() => setShowUserDetails(false)}
            onSave={handleUserUpdate}
          />
        )}
      </Modal>
    </Space>
  );
}

export default React.memo(AssignRole);
