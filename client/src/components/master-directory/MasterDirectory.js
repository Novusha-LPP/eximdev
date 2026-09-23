import React, { useState, useEffect, useRef } from "react";
import { Row, Col, Card, Form, InputGroup, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight, Database } from "lucide-react";
import axios from "axios";
import "../../styles/home.scss"; // Reusing home styles for consistency

const DIRECTORY_COLORS = {
  "Organization": "#2563eb",
  "Custom Houses": "#7c3aed",
  "Shipping Lines": "#0284c7",
  "Terminals": "#0d9488",
  "CFS": "#0891b2",
  "Suppliers": "#ca8a04",
  "Transporters": "#d97706",
  "Currencies": "#16a34a",
  "Countries": "#4f46e5",
  "Airlines": "#0891b2",
  "Units": "#64748b",
  "Ports": "#059669",
  "General Org": "#9333ea",
  "Empty Off Location": "#ea580c",
  "Indian Ports": "#e11d48",
  "Notification Directory": "#be123c",
};

const MasterDirectory = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const debounceRef = useRef(null);

  const masterCategories = [
    { title: "Notification Directory", path: "/notification-directory", description: "Tariff & exemption notifications for Section B (Item Duty), Section C (Other Duties), and Section D (Other Duties-A)." },
    { title: "Custom Houses", path: "/custom-house-directory", description: "List of supported custom houses (ICD)." },
    { title: "Shipping Lines", path: "/shipping-line-directory", description: "Database of shipping line partners." },
    { title: "Terminals", path: "/terminal-directory", description: "Database of Terminal partners." },
    { title: "CFS", path: "/cfs-directory", description: "Database of CFS partners for CFS virtual balance." },
    { title: "Suppliers", path: "/supplier-directory", description: "Database of international and local suppliers." },
    { title: "Transporters", path: "/transporter-directory", description: "Database of transport partners and logistics." },
    { title: "Currencies", path: "/currency-directory", description: "Database of global currencies and codes." },
    { title: "Countries", path: "/country-directory", description: "Global country master list with codes." },
    { title: "Airlines", path: "/airlines-directory", description: "Comprehensive airline database and tracking." },
    { title: "Units", path: "/unit-directory", description: "Standardized unit of measurement master list." },
    { title: "Ports", path: "/port-directory", description: "Port of loading and discharge master." },
    { title: "Organization", path: "/organization-directory", description: "Manage organization details from Customer KYC." },
    { title: "General Org", path: "/general-org-directory", description: "Database of general organizations and vendors." },
    { title: "Empty Off Location", path: "/empty-off-location-directory", description: "Database of empty container off-load locations." },
    { title: "Indian Ports", path: "/indian-port-directory", description: "Database of Indian ports with address details." },
  ];

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = searchTerm.trim();
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/master-directory/global-search`,
          {
            params: { q: query },
            withCredentials: true,
          }
        );
        setResults(res.data?.results || []);
      } catch (err) {
        console.error("Global directory search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const handleClear = () => {
    setSearchTerm("");
    setResults([]);
    setSelectedFilter("ALL");
  };

  const handleResultClick = (result) => {
    if (result.path && result.path !== "#") {
      navigate(result.path);
    }
  };

  // Compute directory distribution for filter tags
  const directoryCounts = results.reduce((acc, item) => {
    acc[item.directory] = (acc[item.directory] || 0) + 1;
    return acc;
  }, {});

  const filteredResults =
    selectedFilter === "ALL"
      ? results
      : results.filter((item) => item.directory === selectedFilter);

  return (
    <div className="job-details-container">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div>
          <h3 className="mb-1 fw-bold text-dark">Master Directory</h3>
          <p className="text-muted mb-0" style={{ fontSize: "0.95rem" }}>
            Centralized management and unified search across all master data records.
          </p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div
        className="mb-4 p-3 rounded-3"
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <InputGroup className="shadow-sm">
          <InputGroup.Text
            style={{
              backgroundColor: "#ffffff",
              borderRight: "none",
              borderColor: "#cbd5e1",
            }}
          >
            <Search size={20} color="#64748b" />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Global search across all directories (e.g., Organization, Port, Shipping Line, Airline, Custom House, Country, Currency)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedFilter("ALL");
            }}
            style={{
              borderLeft: "none",
              borderRight: searchTerm ? "none" : undefined,
              borderColor: "#cbd5e1",
              fontSize: "1rem",
              padding: "12px 14px",
            }}
          />
          {searchTerm && (
            <InputGroup.Text
              onClick={handleClear}
              style={{
                backgroundColor: "#ffffff",
                cursor: "pointer",
                borderColor: "#cbd5e1",
              }}
              title="Clear search"
            >
              <X size={18} color="#64748b" />
            </InputGroup.Text>
          )}
        </InputGroup>

        {/* Search Results Summary & Filter Chips */}
        {searchTerm.trim() && (
          <div className="mt-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2">
                {loading ? (
                  <div className="d-flex align-items-center gap-2 text-primary small fw-semibold">
                    <Spinner animation="border" size="sm" />
                    Searching across all directories...
                  </div>
                ) : (
                  <span className="small text-muted fw-semibold">
                    Found <strong>{results.length}</strong> matching records across{" "}
                    <strong>{Object.keys(directoryCounts).length}</strong>{" "}
                    {Object.keys(directoryCounts).length === 1 ? "directory" : "directories"}
                  </span>
                )}
              </div>

              {/* Directory Filter Chips */}
              {!loading && results.length > 0 && (
                <div className="d-flex flex-wrap gap-1 align-items-center">
                  <span className="small text-muted me-1">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFilter("ALL")}
                    className={`btn btn-sm ${
                      selectedFilter === "ALL" ? "btn-primary" : "btn-outline-secondary"
                    }`}
                    style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px" }}
                  >
                    All ({results.length})
                  </button>
                  {Object.entries(directoryCounts).map(([dir, count]) => {
                    const badgeColor = DIRECTORY_COLORS[dir] || "#475569";
                    const isSelected = selectedFilter === dir;
                    return (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setSelectedFilter(dir)}
                        className="btn btn-sm"
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: isSelected ? badgeColor : "transparent",
                          color: isSelected ? "#fff" : badgeColor,
                          border: `1px solid ${badgeColor}`,
                          fontWeight: isSelected ? 600 : 500,
                        }}
                      >
                        {dir} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Results Grid / List */}
            {!loading && filteredResults.length > 0 && (
              <Row className="mt-3 g-2">
                {filteredResults.map((item, idx) => {
                  const badgeColor = DIRECTORY_COLORS[item.directory] || "#475569";
                  return (
                    <Col xs={12} md={6} key={item.id ? `${item.directory}-${item.id}` : idx}>
                      <div
                        onClick={() => handleResultClick(item)}
                        className="p-3 bg-white rounded-3 shadow-sm h-100 d-flex flex-column justify-content-between"
                        style={{
                          border: "1px solid #e2e8f0",
                          borderLeft: `4px solid ${badgeColor}`,
                          cursor: "pointer",
                          transition: "all 0.15s ease-in-out",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)";
                          e.currentTarget.style.borderColor = badgeColor;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                      >
                        <div>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            {/* Prominent Directory Tag letting user know which directory it belongs to */}
                            <span
                              style={{
                                backgroundColor: `${badgeColor}15`,
                                color: badgeColor,
                                border: `1px solid ${badgeColor}40`,
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: "6px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Database size={12} />
                              {item.directory}
                            </span>
                            <span className="text-muted small d-flex align-items-center gap-1">
                              Open Directory <ArrowRight size={14} />
                            </span>
                          </div>
                          <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: "0.95rem" }}>
                            {item.title}
                          </h6>
                          {item.subtitle && (
                            <p className="text-muted small mb-0" style={{ fontSize: "0.82rem" }}>
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            )}

            {/* No Results Found */}
            {!loading && results.length === 0 && (
              <div
                className="text-center py-4 px-3 bg-white rounded-3 mt-3"
                style={{ border: "1px dashed #cbd5e1" }}
              >
                <Database size={36} className="text-muted mb-2" />
                <h6 className="text-dark fw-bold mb-1">No matching records found</h6>
                <p className="text-muted small mb-0">
                  No directory records matched &ldquo;{searchTerm}&rdquo; across any of the 15 master
                  directories.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <hr />

      {/* Directory Tiles (Original view) */}
      <h5 className="mb-3 fw-bold text-secondary" style={{ fontSize: "1rem" }}>
        All Master Directories ({masterCategories.length})
      </h5>
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
