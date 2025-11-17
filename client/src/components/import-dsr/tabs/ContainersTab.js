// src/pages/job-details/tabs/ContainersTab.jsx
import React from "react";
import FileUpload from "../../gallery/FileUpload";
import ImagePreview from "../../gallery/ImagePreview";

export default function ContainersTab({
  user,
  formik,
  LCLFlag,
  ExBondflag,
  handleAddContainer,
  handleDeleteContainer,      // parent opens confirm dialog
  setContainerToDelete,
  container_number_ref,
  handleCopyContainerNumber,
  setSnackbar,
  handleWeighmentSlip,
  handleTransporterChange,
  handleDeleteRevalidation,
  handleRequiredDoDateChange,
  emptyContainerOffLoadDate,
  setEmptyContainerOffLoadDate,
  deleveryDate,
  setDeliveryDate,
}) {
  const containerStyle = {
    padding: "10px 12px",
    backgroundColor: "#f9f9f9",
    fontFamily: "Arial, sans-serif",
    fontSize: "13px",
  };

  const headerRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  };

  const sectionTitleStyle = {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#333",
    margin: "10px 0 4px 0",
    borderBottom: "1px solid #ddd",
    paddingBottom: "4px",
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: "bold",
    color: "#555",
  };

  const inputStyle = {
    padding: "4px 6px",
    fontSize: "12px",
    border: "1px solid #ccc",
    borderRadius: "3px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  };

  const selectStyle = { ...inputStyle };

  const checkboxLabelStyle = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    cursor: "pointer",
    margin: 0,
  };

  const checkboxInputStyle = {
    width: "14px",
    height: "14px",
    cursor: "pointer",
    margin: 0,
  };

  const buttonStyle = {
    padding: "5px 10px",
    fontSize: "12px",
    border: "1px solid #007bff",
    borderRadius: "3px",
    cursor: "pointer",
    fontWeight: "bold",
    backgroundColor: "#007bff",
    color: "white",
  };

  const smallButtonStyle = {
    ...buttonStyle,
    padding: "3px 8px",
    fontSize: "11px",
  };

  const deleteButtonStyle = {
    ...smallButtonStyle,
    backgroundColor: "#dc3545",
    borderColor: "#dc3545",
  };

  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: "4px",
    backgroundColor: "#fff",
    padding: "8px",
    marginBottom: "8px",
  };

  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    marginBottom: "6px",
  };

  const fieldStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  };

  const fileBoxStyle = {
    borderTop: "1px solid #eee",
    marginTop: "6px",
    paddingTop: "6px",
  };

  const containers = formik.values.container_nos || [];

  const handleCopyClick = (e, value) => {
    if (!value) return;
    handleCopyContainerNumber(e, value, setSnackbar);
  };

  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <h3 style={sectionTitleStyle}>Containers</h3>
        <button
          type="button"
          style={buttonStyle}
          onClick={handleAddContainer}
        >
          + Add Container
        </button>
      </div>

      {/* Required DO validity (job level to container level) */}
      {containers.length > 0 && (
        <div
          style={{
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <label style={labelStyle}>Required DO Validity (All):</label>
          <input
            type="date"
            style={inputStyle}
            value={containers[0]?.required_do_validity_upto || ""}
            onChange={(e) => handleRequiredDoDateChange(e.target.value)}
          />
        </div>
      )}

      {containers.length === 0 && (
        <p style={{ fontSize: "12px", color: "#777" }}>
          No containers added yet. Click "Add Container" to create one.
        </p>
      )}

      {containers.map((container, index) => (
        <div key={index} style={cardStyle}>
          {/* header of card */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                #{index + 1}
              </span>
              <span style={{ fontSize: "12px", color: "#555" }}>
                {container.container_number || "New Container"}
              </span>
              {container.container_number && (
                <button
                  type="button"
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: "11px",
                    cursor: "pointer",
                    color: "#007bff",
                    textDecoration: "underline",
                  }}
                  onClick={(e) =>
                    handleCopyClick(e, container.container_number)
                  }
                >
                  Copy
                </button>
              )}
            </div>
            <button
              type="button"
              style={deleteButtonStyle}
              onClick={() => {
                setContainerToDelete(index);
                handleDeleteContainer();
              }}
            >
              Delete
            </button>
          </div>

          {/* Row 1: Container no, Size, Arrival, Rail-out */}
          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Container No:</label>
              <input
                type="text"
                ref={(el) => (container_number_ref.current[index] = el)}
                style={inputStyle}
                value={container.container_number || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].container_number`,
                    e.target.value
                  )
                }
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Size:</label>
              <input
                type="text"
                style={inputStyle}
                value={container.size || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].size`,
                    e.target.value
                  )
                }
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Arrival Date:</label>
              <input
                type="datetime-local"
                style={inputStyle}
                value={container.arrival_date || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].arrival_date`,
                    e.target.value
                  )
                }
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Rail Out Date:</label>
              <input
                type="datetime-local"
                style={inputStyle}
                value={container.container_rail_out_date || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].container_rail_out_date`,
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* Row 2: Delivery, Empty Offload, DO Validity, DO Revalidation */}
          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                {LCLFlag ? "Delivery Date:" : "Empty Offload:"}
              </label>
              <input
                type="datetime-local"
                style={inputStyle}
                value={
                  LCLFlag
                    ? container.delivery_date || ""
                    : container.emptyContainerOffLoadDate || ""
                }
                onChange={(e) => {
                  if (LCLFlag) {
                    formik.setFieldValue(
                      `container_nos[${index}].delivery_date`,
                      e.target.value
                    );
                  } else {
                    formik.setFieldValue(
                      `container_nos[${index}].emptyContainerOffLoadDate`,
                      e.target.value
                    );
                  }
                }}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>DO Validity:</label>
              <input
                type="date"
                style={inputStyle}
                value={container.do_validity_upto_container_level || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].do_validity_upto_container_level`,
                    e.target.value
                  )
                }
              />
            </div>

            <div style={fieldStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  style={checkboxInputStyle}
                  checked={(container.do_revalidation || []).length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const currentDateTime = new Date(
                        Date.now() -
                          new Date().getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .slice(0, 16);
                      const updated =
                        container.do_revalidation?.length > 0
                          ? container.do_revalidation
                          : [];
                      updated.push({
                        date: currentDateTime,
                      });
                      formik.setFieldValue(
                        `container_nos[${index}].do_revalidation`,
                        updated
                      );
                    } else {
                      formik.setFieldValue(
                        `container_nos[${index}].do_revalidation`,
                        []
                      );
                    }
                  }}
                />
                DO Revalidation
              </label>

              {container.do_revalidation &&
                container.do_revalidation.length > 0 && (
                  <ul
                    style={{
                      listStyle: "none",
                      paddingLeft: 0,
                      margin: "2px 0 0 0",
                      fontSize: "11px",
                    }}
                  >
                    {container.do_revalidation.map((reval, idx) => (
                      <li key={idx}>
                        {new Date(reval.date).toLocaleString()}
                        <button
                          type="button"
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#dc3545",
                            cursor: "pointer",
                            fontSize: "11px",
                            marginLeft: "4px",
                          }}
                          onClick={() =>
                            handleDeleteRevalidation(index, idx)
                          }
                        >
                          x
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Transporter:</label>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="text"
                  style={{ ...inputStyle, flex: 1 }}
                  value={container.transporter || ""}
                  onChange={(e) =>
                    formik.setFieldValue(
                      `container_nos[${index}].transporter`,
                      e.target.value
                    )
                  }
                  placeholder="Name / Code"
                />
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    style={checkboxInputStyle}
                    checked={container.transporter === "SRCC"}
                    onChange={(e) => handleTransporterChange(e, index)}
                  />
                  SRCC
                </label>
              </div>
            </div>
          </div>

          {/* Row 3: Weights */}
          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Physical Wt:</label>
              <input
                type="number"
                style={inputStyle}
                value={container.physical_weight || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].physical_weight`,
                    e.target.value
                  )
                }
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tare Wt:</label>
              <input
                type="number"
                style={inputStyle}
                value={container.tare_weight || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].tare_weight`,
                    e.target.value
                  )
                }
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Actual Wt:</label>
              <input
                type="number"
                style={inputStyle}
                value={container.actual_weight || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].actual_weight`,
                    e.target.value
                  )
                }
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Net Wt:</label>
              <input
                type="number"
                style={inputStyle}
                value={container.net_weight || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].net_weight`,
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* Row 4: Container Gross / Shortage */}
          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Container Gross:</label>
              <input
                type="number"
                style={inputStyle}
                value={container.container_gross_weight || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].container_gross_weight`,
                    e.target.value
                  )
                }
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Weight Shortage:</label>
              <input
                type="number"
                style={inputStyle}
                value={container.weight_shortage || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    `container_nos[${index}].weight_shortage`,
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* Weighment slip upload area */}
          <div style={fileBoxStyle}>
            <label style={labelStyle}>Weighment Slip:</label>
            <FileUpload
              label="Upload Weighment"
              bucketPath="weighment_slips"
              onFilesUploaded={(files, AWSInstance) =>
                handleWeighmentSlip(
                  { target: { files } },
                  container.container_number,
                  "weighment_slips",
                  AWSInstance
                )
              }
              singleFileOnly={false}
            />
            {/* If you store weighment files in container.weighment_slips, preview them. */}
            <ImagePreview
              images={container.weighment_slips || []}
              onDeleteImage={() => {
                // if you need delete logic, wire it here
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
