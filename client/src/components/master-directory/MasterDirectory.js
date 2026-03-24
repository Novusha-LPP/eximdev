import React from "react";
import { Row, Col, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "../../styles/home.scss"; // Reusing home styles for consistency

const MasterDirectory = () => {
  const navigate = useNavigate();

  const masterCategories = [
    { title: "Custom Houses", path: "#", description: "List of supported custom houses (ICD)." },
    { title: "Shipping Lines", path: "#", description: "Database of shipping line partners." },
    { title: "Countries", path: "/country-directory", description: "Global country master list with codes." },
    { title: "Airlines", path: "/airlines-directory", description: "Comprehensive airline database and tracking." },
    { title: "Units", path: "/unit-directory", description: "Standardized unit of measurement master list." },
    { title: "Ports", path: "#", description: "Port of loading and discharge master." },
    { title: "Organization", path: "/organization-directory", description: "Manage organization details from Customer KYC." },
  ];

  return (
    <div className="job-details-container">
      <h3>Master Directory</h3>
      <p style={{ color: "#666" }}>Centralized management for all master data records.</p>
      <hr />
      <Row>
        {masterCategories.map((category, index) => (
          <Col key={index} xs={12} md={6} lg={4} className="mb-4">
            <Card 
              className="h-100 shadow-sm border-0 module-col-inner" 
              onClick={() => category.path !== "#" && navigate(category.path)}
              style={{ cursor: category.path === "#" ? "default" : "pointer", padding: "20px" }}
            >
              <Card.Body>
                <Card.Title><strong>{category.title}</strong></Card.Title>
                <Card.Text style={{ color: "#555", fontSize: "0.9rem" }}>
                  {category.description}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default MasterDirectory;
