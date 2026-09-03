import React, { useEffect, useState, useCallback } from 'react';
import { 
  Table, 
  Tag, 
  Button, 
  Input, 
  Space, 
  Typography, 
  Card, 
  Avatar, 
  Select, 
  Divider,
  Tooltip
} from 'antd';
import { 
  SearchOutlined, 
  UserOutlined, 
  CheckCircleOutlined, 
  DollarCircleOutlined,
  ExportOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { useKyc } from './hooks/useKyc';
import dayjs from 'dayjs';
import '../customerKyc/customerKyc.css';

const { Text, Title } = Typography;
const { Option } = Select;

const CATEGORIES = ['All', 'Individual/ Proprietary Firm', 'Partnership Firm', 'Company', 'Trust Foundations'];

export default function CustomerList({ onNavigate }) {
  const { getCustomers, loading } = useKyc();
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const load = useCallback(() => {
    const params = {};
    if (category !== 'All') params.category = category;
    if (search) params.search = search;
    getCustomers(params).then(setData).catch(() => {});
  }, [getCustomers, category, search]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      title: 'Customer Entity',
      dataIndex: 'name_of_individual',
      key: 'name',
      fixed: 'left',
      render: (text, record) => (
        <Space onClick={() => onNavigate('completeCustomer', record)} style={{ cursor: 'pointer' }}>
          <Avatar style={{ backgroundColor: '#f0fdf4', color: '#22c55e' }} icon={<GlobalOutlined />} />
          <div>
            <div style={{ fontWeight: 700, color: '#1e293b' }}>{text}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>IEC: {record.iec_no}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Tax Identity (PAN)',
      dataIndex: 'pan_no',
      key: 'pan',
      render: (pan) => <Text style={{ fontFamily: 'monospace' }}>{pan || '—'}</Text>
    },
    {
      title: 'Business Category',
      dataIndex: 'category',
      key: 'category',
      render: (tag) => <Tag color="blue" style={{ borderRadius: '4px' }}>{tag}</Tag>
    },
    {
      title: 'Risk Approval',
      dataIndex: 'approval',
      key: 'approval',
      render: (status) => (
        <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontWeight: 600, borderRadius: '4px' }}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Credit Exposure',
      dataIndex: 'outstanding_limit',
      key: 'limit',
      render: (limit) => limit ? (
        <Text strong style={{ color: '#059669' }}>
          ₹{Number(limit).toLocaleString()}
        </Text>
      ) : <Text type="secondary">—</Text>
    },
    {
      title: 'Last Activity',
      dataIndex: 'updatedAt',
      key: 'updated',
      render: (date) => dayjs(date).format('DD MMM YYYY')
    },
    {
      title: 'View',
      key: 'action',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Tooltip title="View Full KYC Profile">
          <Button 
            shape="circle" 
            icon={<ExportOutlined />} 
            onClick={() => onNavigate('completeCustomer', record)}
          />
        </Tooltip>
      )
    }
  ];

  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Approved Customers</Title>
          <Text type="secondary">Onboarded entities with cleared KYC and risk profiles</Text>
        </div>
        <Space size="middle">
          <Select 
            value={category} 
            onChange={setCategory} 
            style={{ width: 220 }}
            size="large"
          >
            {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
          <Input.Search
            placeholder="Search IEC, Name, PAN..."
            size="large"
            style={{ width: 300 }}
            onSearch={load}
            onChange={e => setSearch(e.target.value)}
          />
        </Space>
      </div>

      <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 12, position: ['bottomRight'] }}
          scroll={{ x: 1000 }}
          className="premium-table"
        />
      </Card>
    </div>
  );
}
