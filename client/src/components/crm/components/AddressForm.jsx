import React from 'react';
import { Form, Input, Row, Col, Checkbox } from 'antd';

/**
 * AddressForm — reusable address fields section
 * @param {string} prefix  - field name prefix e.g. 'permanent_address' or 'principle_business'
 * @param {string} title   - section title
 */
function AddressForm({ prefix, title }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {title && <div style={{ fontWeight: 600, marginBottom: 8, color: '#1890ff' }}>{title}</div>}
      <Row gutter={[16, 4]}>
        <Col xs={24} sm={12}>
          <Form.Item name={`${prefix}_line_1`} label="Address Line 1">
            <Input placeholder="Building / Street" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name={`${prefix}_line_2`} label="Address Line 2">
            <Input placeholder="Area / Locality" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name={`${prefix}_city`} label="City">
            <Input placeholder="City" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name={`${prefix}_state`} label="State">
            <Input placeholder="State" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name={`${prefix}_pin_code`}
            label="Pin Code"
            rules={[{ pattern: /^\d{6}$/, message: 'Enter a valid 6-digit pin code' }]}
          >
            <Input placeholder="6-digit pin code" maxLength={6} />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}

export default AddressForm;
