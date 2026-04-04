import React, { useState, useRef, useCallback, useContext } from 'react';
import axios from 'axios';
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Card, 
  Typography, 
  Row, 
  Col, 
  Divider, 
  message, 
  Space, 
  Tag,
  Avatar
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  SendOutlined, 
  UserOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useKyc } from './hooks/useKyc';
import { UserContext } from '../../contexts/UserContext';
import '../customerKyc/KycForm.scss';

const { Title, Text, Paragraph } = Typography;

const CATEGORIES = [
  'Individual/ Proprietary Firm',
  'Partnership Firm',
  'Company',
  'Trust Foundations',
];
const STATUSES = ['Manufacturer', 'Trader'];

function AddSuspectKYC({ onNavigate, editRecord }) {
  const { user } = useContext(UserContext);
  const { createSuspect, updateSuspect, submitSuspect, loading } = useKyc();
  const [form] = Form.useForm();
  const isEdit = !!editRecord;

  const [iecState, setIecState] = useState({ checking: false, available: null, message: '' });

  /* ── IEC check on blur ────────────────────────────────────────────────── */
  const handleIecBlur = async (e) => {
    const iec = e.target.value.trim();
    if (!iec || iec.length !== 10 || (isEdit && iec === editRecord?.iec_no)) {
      setIecState({ checking: false, available: null, message: '' });
      return;
    }
    
    setIecState({ checking: true, available: null, message: '' });
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/suspects/check-iec/${iec}`,
        { withCredentials: true }
      );
      const available = res.data.available;
      setIecState({ checking: false, available, message: res.data.message });
      if (!available) {
        message.warning(res.data.message || 'IEC already registered.');
      }
    } catch {
      setIecState({ checking: false, available: null, message: '' });
    }
  };

  const handleFinish = async (values, saveAsDraft = false) => {
    const payload = {
      name_of_individual: values.name_of_individual.trim(),
      iec_no:             values.iec_no.trim().toUpperCase(),
      category:           values.category,
      status:             values.status,
    };

    try {
      if (isEdit) {
        await updateSuspect(editRecord._id, payload);
        if (!saveAsDraft) {
          await submitSuspect(editRecord._id);
          message.success('Submitted updated lead to pipeline');
          onNavigate('prospects');
        } else {
          message.success('Draft updated');
          onNavigate('suspects');
        }
      } else {
        await createSuspect({ ...payload, draft: saveAsDraft ? 'true' : 'false' });
        if (saveAsDraft) {
          message.success('Lead draft saved');
          onNavigate('suspects');
        } else {
          message.success('Lead created and submitted to Contacted stage');
          onNavigate('prospects');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.5s ease", maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Button 
          type="link" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => onNavigate('suspects')}
          style={{ padding: 0, height: 'auto', marginBottom: '1rem' }}
        >
          Back to list
        </Button>
        <Title level={2} style={{ margin: 0, fontWeight: 800 }}>
          {isEdit ? 'Edit Lead Profile' : 'Capture New Lead'}
        </Title>
        <Text type="secondary">Enter the foundation details for a new logistics connection.</Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name_of_individual: editRecord?.name_of_individual || '',
          iec_no:             editRecord?.iec_no || '',
          category:           editRecord?.category || '',
          status:             editRecord?.status || '',
        }}
        onFinish={(vals) => handleFinish(vals, false)}
      >
        <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Space align="center" style={{ marginBottom: '2rem' }}>
            <Avatar size="large" style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-600)' }} icon={<GlobalOutlined />} />
            <div>
              <Text strong style={{ fontSize: '1.1rem' }}>Principal Identification</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>Required for regulatory verification</Text>
            </div>
          </Space>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name_of_individual"
                label={<Text strong>Company / Legal Name</Text>}
                rules={[{ required: true, message: 'Please enter company name' }]}
              >
                <Input size="large" placeholder="e.g. Acme Logistics Pvt Ltd" prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="iec_no"
                label={<Text strong>IEC Number</Text>}
                rules={[
                  { required: true, message: 'IEC is required' },
                  { len: 10, message: 'IEC must be 10 characters' },
                  { pattern: /^[A-Z0-9]+$/, message: 'Alphanumeric only' }
                ]}
                extra={iecState.available === true && <Text type="success" style={{ fontSize: '11px' }}>✓ IEC check passed</Text>}
              >
                <Input 
                  size="large" 
                  placeholder="AAAA123456" 
                  maxLength={10} 
                  onBlur={handleIecBlur}
                  disabled={isEdit}
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  suffix={iecState.checking ? <LoadingOutlined /> : iecState.available === true ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : null}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '1.5rem 0' }} />

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="category"
                label={<Text strong>Business Category</Text>}
                rules={[{ required: true, message: 'Select a category' }]}
              >
                <Select size="large" placeholder="Select category">
                  {CATEGORIES.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="status"
                label={<Text strong>Registration Status</Text>}
              >
                <Select size="large" placeholder="Select status (Optional)" allowClear>
                  {STATUSES.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            background: '#fafafa', 
            borderRadius: '12px',
            border: '1px solid #f0f0f0' 
          }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Capture takes less than 60 seconds. <br />
                  Full KYC documentation will be required at the "Customer" stage.
                </Text>
              </Col>
              <Col>
                <Space>
                  <Button 
                    size="large" 
                    icon={<SaveOutlined />} 
                    onClick={() => {
                      form.validateFields().then(vals => handleFinish(vals, true));
                    }}
                    loading={loading}
                    disabled={iecState.available === false}
                  >
                    Save Draft
                  </Button>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<SendOutlined />} 
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={() => form.submit()}
                    loading={loading}
                    disabled={iecState.available === false}
                  >
                    {isEdit ? 'Submit Update' : 'Initialize Prospect'}
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>
        </Card>
      </Form>
    </div>
  );
}

export default React.memo(AddSuspectKYC);
