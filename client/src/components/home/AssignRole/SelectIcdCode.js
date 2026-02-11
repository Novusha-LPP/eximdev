import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import {
  Form,
  Select,
  Button,
  Card,
  Typography,
  Alert,
  Spin,
  Space,
  Tag,
  message,
  Popconfirm
} from "antd";
import { UserContext } from "../../../contexts/UserContext";

const { Option } = Select;
const { Title, Text } = Typography;

function SelectIcdCode({ selectedUser }) {
  const [selectedIcdCodes, setSelectedIcdCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const { user } = useContext(UserContext);
  const [form] = Form.useForm();

  // ICD Code options
  const icdCodeOptions = [
    "ICD SACHANA",
    "ICD SANAND",
    "ICD KHODIYAR",
  ];

  useEffect(() => {
    // Reset form when selected user changes
    setSelectedIcdCodes([]);
    form.resetFields();

    // Fetch user data to check current ICD assignment
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
      // Set current ICD codes if user already has them assigned
      const currentIcdCodes = res.data.selected_icd_codes || [];
      setSelectedIcdCodes(currentIcdCodes);
      form.setFieldsValue({ icdCodes: currentIcdCodes });
    } catch (error) {
      console.error("Error fetching user data:", error);
      message.error("Error fetching user information");
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    const codes = values.icdCodes;

    // Check if current user has admin privileges
    if (user.role !== "Admin" && user.role !== "Head_of_Department") {
      message.error("Only admins or HODs can assign ICD codes");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/admin/assign-icd-code`,
        {
          username: selectedUser,
          selectedIcdCodes: codes,
          adminUsername: user.username
        }
      );

      message.success(response.data.message || "ICD codes assigned successfully");

      // Update local user data to reflect the change
      setUserData(prev => ({
        ...prev,
        selected_icd_codes: codes
      }));

    } catch (error) {
      console.error("Error assigning ICD codes:", error);

      if (error.response?.status === 403) {
        message.error(error.response.data.message || "Unauthorized action");
      } else if (error.response?.status === 404) {
        message.error("User not found");
      } else {
        message.error(error.response?.data?.message || "Error assigning ICD codes");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAllIcdCodes = async () => {
    if (!userData?.selected_icd_codes || userData.selected_icd_codes.length === 0) {
      message.warning("No ICD codes assigned to remove");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/admin/remove-icd-code`,
        {
          username: selectedUser,
          adminUsername: user.username
        }
      );

      message.success(response.data.message || "All ICD codes removed successfully");
      setSelectedIcdCodes([]);
      form.setFieldsValue({ icdCodes: [] });

      // Update local user data
      setUserData(prev => ({
        ...prev,
        selected_icd_codes: []
      }));

    } catch (error) {
      console.error("Error removing ICD codes:", error);
      message.error(error.response?.data?.message || "Error removing ICD codes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={`Assign ICD Codes for ${selectedUser}`} bordered={false}>
      <Spin spinning={loading}>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {selectedUser && (
              <Button onClick={fetchUserData} loading={loading}>
                Refresh Data
              </Button>
            )}
          </div>

          {/* Display current ICD assignments */}
          {userData?.selected_icd_codes && userData.selected_icd_codes.length > 0 ? (
            <Alert
              message={`Currently Assigned ICD Codes (${userData.selected_icd_codes.length})`}
              description={
                <div style={{ marginTop: 8 }}>
                  {userData.selected_icd_codes.map((code, index) => (
                    <Tag key={index} color="blue">{code}</Tag>
                  ))}
                </div>
              }
              type="info"
              showIcon
            />
          ) : (
            <Alert
              message="No ICD Codes Assigned"
              description={`No ICD codes are currently assigned to ${userData?.username || selectedUser}. Use the form below to assign.`}
              type="warning"
              showIcon
            />
          )}

          {user.role !== "Admin" && user.role !== "Head_of_Department" ? (
            <Alert message="Only administrators or HODs can assign ICD codes to users" type="error" showIcon />
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ icdCodes: selectedIcdCodes }}
            >
              <Form.Item
                name="icdCodes"
                label="Select ICD Codes"
                rules={[{ required: true, message: 'Please select at least one ICD code' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select ICD Codes"
                  style={{ width: '100%' }}
                  onChange={setSelectedIcdCodes}
                >
                  {icdCodeOptions.map((code) => (
                    <Option key={code} value={code}>{code}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Assign ICD Codes
                  </Button>

                  {userData?.selected_icd_codes && userData.selected_icd_codes.length > 0 && (
                    <Popconfirm
                      title="Are you sure remove all ICD codes?"
                      onConfirm={handleRemoveAllIcdCodes}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button danger loading={loading}>
                        Remove All ICD Codes
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

export default SelectIcdCode;