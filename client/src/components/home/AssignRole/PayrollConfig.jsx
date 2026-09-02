import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import {
  Form,
  Radio,
  InputNumber,
  Input,
  Button,
  Card,
  Spin,
  message,
  Space,
  Typography
} from "antd";
import { DollarOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { UserContext } from "../../../contexts/UserContext.js";

const { Text } = Typography;

function PayrollConfig({ selectedUser }) {
  const [form] = Form.useForm();
  const { user: currentUser } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  const [category, setCategory] = useState("MANAGEMENT"); // "MANAGEMENT" or "OPERATOR"

  // Fetch employee details and active payroll config
  useEffect(() => {
    async function fetchPayrollConfig() {
      if (!selectedUser) return;
      setLoading(true);
      try {
        // 1. Resolve employee details (username -> id, company_id)
        const username = typeof selectedUser === "string" ? selectedUser : selectedUser.username;
        const userRes = await axios.get(`${process.env.REACT_APP_API_STRING}/get-user/${username}`);
        const emp = userRes.data;
        setEmployeeData(emp);

        if (emp && emp._id) {
          // 2. Fetch active payroll config
          const configRes = await axios.get(
            `${process.env.REACT_APP_API_STRING}/payroll/config/${emp._id}`
          );

          if (configRes.data.success && configRes.data.data) {
            const config = configRes.data.data;
            const cat = config.is_operator ? "OPERATOR" : "MANAGEMENT";
            setCategory(cat);

            form.setFieldsValue({
              category: cat,
              monthly_salary: config.monthly_salary,
              daily_wage: config.daily_wage,
              overtime_rate_per_hour: config.overtime_rate_per_hour,
              effective_from: config.effective_from ? config.effective_from.split("T")[0] : new Date().toISOString().split("T")[0],
              revision_reason: config.revision_reason || ""
            });
          } else {
            // Default initial form values
            setCategory("MANAGEMENT");
            form.setFieldsValue({
              category: "MANAGEMENT",
              monthly_salary: 0,
              daily_wage: 0,
              overtime_rate_per_hour: 0,
              effective_from: new Date().toISOString().split("T")[0],
              revision_reason: "Initial setup"
            });
          }
        }
      } catch (error) {
        console.error("Error fetching payroll config:", error);
        message.error("Failed to load payroll configuration");
      } finally {
        setLoading(false);
      }
    }

    fetchPayrollConfig();
  }, [selectedUser, form]);

  const onFinish = async (values) => {
    if (!employeeData) return;
    setSaving(true);
    try {
      const isOperator = values.category === "OPERATOR";
      const payload = {
        company_id: employeeData.company_id?._id || employeeData.company_id,
        is_operator: isOperator,
        payroll_type: isOperator ? "DAILY_WAGE" : "MONTHLY",
        monthly_salary: isOperator ? 0 : (values.monthly_salary || 0),
        daily_wage: isOperator ? (values.daily_wage || 0) : 0,
        overtime_eligible: isOperator, // Operators get OT, Management does not
        overtime_rate_per_hour: isOperator ? (values.overtime_rate_per_hour || 0) : 0,
        effective_from: values.effective_from || new Date().toISOString().split("T")[0],
        revision_reason: values.revision_reason || "Update"
      };

      const res = await axios.put(
        `${process.env.REACT_APP_API_STRING}/payroll/config/${employeeData._id}`,
        payload
      );

      if (res.data.success) {
        message.success(res.data.message || "Payroll configuration saved successfully");
      } else {
        message.error(res.data.message || "Failed to save payroll config");
      }
    } catch (error) {
      console.error("Error saving payroll config:", error);
      message.error(error.response?.data?.message || "Failed to save payroll configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <Spin tip="Loading payroll configuration..." />
      </div>
    );
  }

  const username = typeof selectedUser === "string" ? selectedUser : selectedUser?.username;

  return (
    <Card
      title={
        <span>
          <DollarOutlined style={{ marginRight: 8 }} />
          Payroll Settings ({username || "..."})
        </span>
      }
      bordered={false}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          category: "MANAGEMENT",
          monthly_salary: 0,
          daily_wage: 0,
          overtime_rate_per_hour: 0,
          effective_from: new Date().toISOString().split("T")[0]
        }}
      >
        <Form.Item
          name="category"
          label="Employee Category"
          rules={[{ required: true, message: "Please select employee category" }]}
        >
          <Radio.Group onChange={(e) => setCategory(e.target.value)} buttonStyle="solid">
            <Radio.Button value="MANAGEMENT">Management (Monthly)</Radio.Button>
            <Radio.Button value="OPERATOR">Operator (Daily Wage + OT)</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {category === "MANAGEMENT" && (
          <Form.Item
            name="monthly_salary"
            label="Monthly Salary (₹)"
            rules={[{ required: true, message: "Please enter monthly salary" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} placeholder="e.g. 35000" />
          </Form.Item>
        )}

        {category === "OPERATOR" && (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Form.Item
              name="daily_wage"
              label="Daily Wage (₹)"
              rules={[{ required: true, message: "Please enter daily wage" }]}
            >
              <InputNumber style={{ width: "100%" }} min={0} placeholder="e.g. 800" />
            </Form.Item>

            <Form.Item
              name="overtime_rate_per_hour"
              label="Overtime Rate Per Hour (₹)"
              rules={[{ required: true, message: "Please enter overtime rate per hour" }]}
            >
              <InputNumber style={{ width: "100%" }} min={0} placeholder="e.g. 100" />
            </Form.Item>
          </Space>
        )}

        <Form.Item
          name="effective_from"
          label="Effective From Date"
          rules={[{ required: true, message: "Please select effective date" }]}
        >
          <Input type="date" />
        </Form.Item>

        <Form.Item
          name="revision_reason"
          label="Reason for Setup / Revision"
          rules={[{ required: true, message: "Please enter a reason" }]}
        >
          <Input placeholder="e.g. Initial setup, Salary increment" />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save Configuration
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default PayrollConfig;
