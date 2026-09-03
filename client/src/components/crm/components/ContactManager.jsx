import React, { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * ContactManager — CRUD table for array of contacts
 * @param {Array}    value    - contacts array
 * @param {Function} onChange - called with new contacts array
 */
function ContactManager({ value = [], onChange }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [form] = Form.useForm();

  const openAdd = () => {
    setEditIndex(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record, idx) => {
    setEditIndex(idx);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      const updated = [...value];
      if (editIndex === null) {
        updated.push(values);
      } else {
        updated[editIndex] = values;
      }
      onChange && onChange(updated);
      setModalOpen(false);
      form.resetFields();
      message.success(editIndex === null ? 'Contact added.' : 'Contact updated.');
    });
  };

  const handleDelete = (idx) => {
    const updated = value.filter((_, i) => i !== idx);
    onChange && onChange(updated);
    message.success('Contact removed.');
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Designation', dataIndex: 'designation', key: 'designation' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, record, idx) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record, idx)} size="small" />
          <Popconfirm title="Remove this contact?" onConfirm={() => handleDelete(idx)} okText="Yes" cancelText="No">
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>Contacts ({value.length})</Text>
        <Button type="primary" ghost size="small" icon={<PlusOutlined />} onClick={openAdd}>
          Add Contact
        </Button>
      </div>

      <Table
        dataSource={value.map((c, i) => ({ ...c, key: i }))}
        columns={columns}
        size="small"
        pagination={false}
        bordered
        locale={{ emptyText: 'No contacts added yet.' }}
      />

      <Modal
        title={editIndex === null ? 'Add Contact' : 'Edit Contact'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Save"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="Full name" />
          </Form.Item>
          <Form.Item name="designation" label="Designation">
            <Input placeholder="e.g. Manager" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
            rules={[
              { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit phone number starting with 6-9' }
            ]}
          >
            <Input placeholder="10-digit mobile number" maxLength={10} />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Enter a valid email address' }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ContactManager;
