import React from "react";
import { Row, Col } from "react-bootstrap";
import { TextField, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import JobDetailsRowHeading from "../JobDetailsRowHeading";

const QueriesSection = ({ 
  formik, 
  user, 
  confirmDialog, 
  setConfirmDialog 
}) => {
  const queryTypes = [
    { key: "do_queries", label: "DO Queries" },
    { key: "documentationQueries", label: "Documentation Queries" },
    { key: "eSachitQueries", label: "E-Sanchit Queries" },
    { key: "submissionQueries", label: "Submission Queries" },
  ];

  return (
    <div className="job-details-container">
      <JobDetailsRowHeading heading="Queries" />
      <br />

      {queryTypes.map(
        ({ key, label }) =>
          formik.values[key]?.length > 0 && (
            <div key={key} style={{ marginBottom: '20px' }}>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <h5 
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '6px',
                  }}
                >
                  {label}
                </h5>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formik.values[key].map((item, id) => {
                    const isResolved = item.resolved;
                    const namePrefix = `${key}[${id}]`;

                    return (
                      <div
                        key={id}
                        style={{
                          backgroundColor: isResolved ? '#f1f5f9' : '#ffffff',
                          borderRadius: '8px',
                          padding: '12px',
                          border: `1px solid ${isResolved ? '#cbd5e1' : '#e2e8f0'}`,
                          boxShadow: isResolved 
                            ? '0 1px 2px rgba(0, 0, 0, 0.05)' 
                            : '0 1px 3px rgba(0, 0, 0, 0.06)',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          opacity: isResolved ? 0.8 : 1,
                        }}
                      >
                        <Row className="align-items-center" style={{ minHeight: '40px' }}>
                          <Col xs={12} md={1} className="d-flex align-items-center justify-content-center">
                            {!isResolved ? (
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: '#fef2f2',
                                  border: '1px solid #fca5a5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#dc2626',
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f0fdf4',
                                  border: '1px solid #86efac',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <CheckCircleIcon
                                  style={{
                                    fontSize: '16px',
                                    color: '#16a34a',
                                  }}
                                />
                              </div>
                            )}
                          </Col>

                          <Col xs={12} md={4}>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: '#1e293b',
                                lineHeight: '1.4',
                                marginBottom: '2px',
                              }}
                            >
                              {item.query}
                            </div>
                          </Col>

                          <Col xs={12} md={5}>
                            <TextField
                              fullWidth
                              size="small"
                              variant="outlined"
                              id={`${namePrefix}.reply`}
                              name={`${namePrefix}.reply`}
                              placeholder="Enter reply..."
                              value={item.reply}
                              disabled={isResolved}
                              onChange={formik.handleChange}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '6px',
                                  backgroundColor: isResolved ? '#f8fafc' : '#ffffff',
                                  fontSize: '0.875rem',
                                  minHeight: '36px',
                                  '& fieldset': {
                                    borderColor: '#e2e8f0',
                                  },
                                  '&:hover fieldset': {
                                    borderColor: '#cbd5e1',
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: '#64748b',
                                    borderWidth: '1px',
                                  },
                                  '&.Mui-disabled': {
                                    backgroundColor: '#f8fafc',
                                    '& fieldset': {
                                      borderColor: '#e2e8f0',
                                    },
                                  },
                                },
                                '& .MuiInputBase-input': {
                                  padding: '8px 12px',
                                },
                              }}
                            />
                          </Col>

                          <Col
                            xs={12}
                            md={2}
                            className="d-flex align-items-center justify-content-center gap-2"
                          >
                            <div
                              style={{
                                display: 'flex',
                                gap: '6px',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {!isResolved && (
                                <Tooltip title="Mark as Resolved" arrow>
                                  <div
                                    style={{
                                      padding: '6px',
                                      borderRadius: '6px',
                                      backgroundColor: '#f0fdf4',
                                      border: '1px solid #dcfce7',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = '#dcfce7';
                                      e.target.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = '#f0fdf4';
                                      e.target.style.transform = 'translateY(0)';
                                    }}
                                    onClick={() =>
                                      setConfirmDialog({
                                        open: true,
                                        type: "resolve",
                                        queryKey: key,
                                        queryIndex: id,
                                      })
                                    }
                                  >
                                    <CheckCircleIcon
                                      style={{
                                        fontSize: '18px',
                                        color: '#16a34a',
                                      }}
                                    />
                                  </div>
                                </Tooltip>
                              )}

                              {user.role === "Admin" && (
                                <Tooltip title="Delete Query" arrow>
                                  <div
                                    style={{
                                      padding: '6px',
                                      borderRadius: '6px',
                                      backgroundColor: '#fef2f2',
                                      border: '1px solid #fecaca',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = '#fecaca';
                                      e.target.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = '#fef2f2';
                                      e.target.style.transform = 'translateY(0)';
                                    }}
                                    onClick={() =>
                                      setConfirmDialog({
                                        open: true,
                                        type: "delete",
                                        queryKey: key,
                                        queryIndex: id,
                                      })
                                    }
                                  >
                                    <DeleteIcon
                                      style={{
                                        fontSize: '18px',
                                        color: '#dc2626',
                                      }}
                                    />
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )
      )}
    </div>
  );
};

export default QueriesSection;
