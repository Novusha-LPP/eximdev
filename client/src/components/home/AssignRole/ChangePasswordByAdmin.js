import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Alert,
  message,
  Space
} from "antd";
import { LockOutlined } from "@ant-design/icons";
import { UserContext } from "../../../contexts/UserContext";

function ChangePasswordByAdmin({ selectedUser }) {
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const { user } = useContext(UserContext);
  const [form] = Form.useForm();

  useEffect(() => {
    // Reset form when selected user changes
    form.resetFields();

    // Fetch user data to check role
    if (selectedUser) {
      fetchUserData();
    }
  }, [selectedUser, form]);

  const fetchUserData = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-user/${selectedUser}`
      );
      setUserData(res.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      message.error("Error fetching user information");
    }
  };

  const onFinish = async (values) => {
    const { newPassword, confirmPassword } = values;

    // Additional validation if needed, though Form rules handle most
    if (newPassword !== confirmPassword) {
      form.setFields([
        {
          name: 'confirmPassword',
          errors: ['Passwords do not match'],
        },
      ]);
      return;
    }

    // Check if current user is admin and target user is also admin
    if (userData?.role === "Admin" && user.role === "Admin" && userData.username !== user.username) {
      message.error("Admin cannot change another admin's password");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/admin/change-password`,
        {
          username: selectedUser,
          newPassword: newPassword,
          adminUsername: user.username
        }
      );

      message.success(response.data.message || "Password changed successfully");
      form.resetFields();
    } catch (error) {
      console.error("Error changing password:", error);

      if (error.response?.status === 403) {
        message.error(error.response.data.message || "Unauthorized action");
      } else if (error.response?.status === 404) {
        message.error("User not found");
      } else {
        message.error(error.response?.data?.message || "Error changing password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={`Change Password for ${selectedUser || '...'}`}
      bordered={false}
      style={{ maxWidth: 600 }}
    >
      {userData?.role === "Admin" && user.role === "Admin" && userData.username !== user.username ? (
        <Alert
          type="warning"
          message="Restricted Action"
          description="Admin cannot change another admin's password."
          showIcon
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please input the new password!' },
              { min: 8, message: 'Password must be at least 8 characters long' }
            ]}
            hasFeedback
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Enter new password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['newPassword']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm the new password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords that you entered do not match!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} disabled={!selectedUser}>
              Change Password
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
}

export default ChangePasswordByAdmin;