import React, { useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";

const formatINR = (val) => {
  const num = Number(val || 0);
  return `₹ ${num.toLocaleString("en-IN")}`;
};

export default function ExcelUploadModal({
  isOpen,
  onClose,
  activeUserId,
  onSuccess
}) {
  const [file, setFile] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const handleDownloadTemplate = async (endpoint, filename) => {
    const toastId = toast.loading(`Downloading ${filename}...`);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/transport-invoicing/${endpoint}`,
        {
          responseType: "blob",
          withCredentials: true
        }
      );
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      saveAs(blob, filename);
      toast.success(`Downloaded ${filename}`, { id: toastId });
    } catch (err) {
      console.warn("Blob download error, trying direct link fallback:", err);
      try {
        const fileUrl = `${process.env.REACT_APP_API_STRING}/transport-invoicing/${endpoint}`;
        const link = document.createElement("a");
        link.href = fileUrl;
        link.setAttribute("download", filename);
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Downloading ${filename}`, { id: toastId });
      } catch (fallbackErr) {
        console.error("Direct download failed:", fallbackErr);
        toast.error(`Failed to download ${filename}`, { id: toastId });
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData(null);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      toast.error("Please choose an Excel file to upload.");
      return;
    }

    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (activeUserId) formData.append("userId", activeUserId);

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/transport-invoicing/upload/preview`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true
        }
      );

      if (res.data?.success) {
        setPreviewData(res.data);
        if (res.data.errors?.length > 0) {
          toast.error(`Found ${res.data.errors.length} validation errors in uploaded file.`);
          setActiveTab("errors");
        } else {
          toast.success("Excel parsed & validated successfully! Review preview below.");
          setActiveTab("updated");
        }
      }
    } catch (err) {
      console.error("Preview error:", err);
      toast.error(err.response?.data?.message || "Failed to parse and preview Excel file.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;

    setConfirming(true);
    try {
      const payload = {
        new_records: previewData.new_records || [],
        updated_records: previewData.updated_records || [],
        userId: activeUserId
      };

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/transport-invoicing/upload/confirm`,
        payload,
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message || "Master data updated successfully!");
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Confirm error:", err);
      toast.error(err.response?.data?.message || "Failed to commit master data update.");
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "920px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
              📥 Upload Excel & Master Data Update
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
              Validate, preview diffs (New / Updated / Duplicate / Error), and confirm before saving
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#ffffff",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1.1rem"
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: "auto", padding: "1.5rem", flex: 1 }}>
          {/* File Picker Box */}
          <div
            style={{
              border: "2px dashed #cbd5e1",
              borderRadius: "12px",
              padding: "1.5rem",
              textAlign: "center",
              background: "#f8fafc",
              marginBottom: "1.25rem"
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 700, color: "#1e293b" }}>
              Select Transport Invoicing Excel File
            </p>
            <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#64748b" }}>
              Supports Multi-sheet template (Daily Invoicing, Sundry Debtors, Direct Income) or individual sheets
            </p>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="ti-excel-upload-input"
            />
            <label
              htmlFor="ti-excel-upload-input"
              className="ti-btn ti-btn-secondary"
              style={{ cursor: "pointer", display: "inline-block" }}
            >
              📂 {file ? file.name : "Choose File"}
            </label>

            {file && (
              <button
                type="button"
                className="ti-btn ti-btn-primary"
                style={{ marginLeft: "0.75rem" }}
                onClick={handlePreview}
                disabled={previewing}
              >
                {previewing ? "Validating & Parsing..." : "🔍 Validate & Preview"}
              </button>
            )}

            {/* Template Download Links */}
            <div
              style={{
                marginTop: "1.25rem",
                paddingTop: "0.85rem",
                borderTop: "1px dashed #cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                flexWrap: "wrap"
              }}
            >
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>
                DON'T HAVE THE TEMPLATE?
              </span>
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
                onClick={() => handleDownloadTemplate("template/daily", "Daily_Invoicing_Template.xlsx")}
              >
                📄 Daily Template
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
                onClick={() => handleDownloadTemplate("template/sundry-debtors", "Sundry_Debtors_Template.xlsx")}
              >
                📄 Sundry Template
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
                onClick={() => handleDownloadTemplate("template/master", "Ayan_Invoicing_Template.xlsx")}
              >
                📊 Master Workbook
              </button>
            </div>
          </div>

          {/* Preview Section */}
          {previewData && (
            <div>
              {/* Summary KPIs */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "0.75rem",
                  marginBottom: "1.25rem"
                }}
              >
                <div
                  onClick={() => setActiveTab("new")}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "10px",
                    background: activeTab === "new" ? "#dcfce7" : "#f0fdf4",
                    border: "1px solid #86efac",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803d" }}>
                    🟢 NEW RECORDS
                  </span>
                  <h3 style={{ margin: "4px 0 0", color: "#166534", fontWeight: 800 }}>
                    {previewData.summary?.new_count || 0}
                  </h3>
                </div>

                <div
                  onClick={() => setActiveTab("updated")}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "10px",
                    background: activeTab === "updated" ? "#fef3c7" : "#fffbeb",
                    border: "1px solid #fde68a",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#b45309" }}>
                    🟡 UPDATED RECORDS
                  </span>
                  <h3 style={{ margin: "4px 0 0", color: "#92400e", fontWeight: 800 }}>
                    {previewData.summary?.updated_count || 0}
                  </h3>
                </div>

                <div
                  onClick={() => setActiveTab("duplicate")}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "10px",
                    background: activeTab === "duplicate" ? "#e2e8f0" : "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>
                    ⚪ UNCHANGED / IDENTICAL
                  </span>
                  <h3 style={{ margin: "4px 0 0", color: "#334155", fontWeight: 800 }}>
                    {previewData.summary?.duplicate_count || 0}
                  </h3>
                </div>

                <div
                  onClick={() => setActiveTab("errors")}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "10px",
                    background: activeTab === "errors" ? "#fee2e2" : "#fef2f2",
                    border: "1px solid #fca5a5",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#b91c1c" }}>
                    🔴 VALIDATION ERRORS
                  </span>
                  <h3 style={{ margin: "4px 0 0", color: "#991b1b", fontWeight: 800 }}>
                    {previewData.summary?.error_count || 0}
                  </h3>
                </div>
              </div>

              {/* Records Detail Tables based on active tab */}
              {activeTab === "updated" && (
                <div className="ti-card">
                  <div className="ti-card-header">
                    <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700 }}>
                      🟡 Records with Changes (Old vs Uploaded)
                    </h4>
                  </div>
                  <div className="ti-card-body" style={{ padding: 0 }}>
                    {previewData.updated_records?.length === 0 ? (
                      <p style={{ padding: "1.5rem", margin: 0, color: "#94a3b8", textAlign: "center" }}>
                        No existing records are modified by this upload.
                      </p>
                    ) : (
                      <div className="ti-table-responsive" style={{ maxHeight: "260px" }}>
                        <table className="ti-table">
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>Date</th>
                              <th>Target / Branch</th>
                              <th>Existing Value in Master</th>
                              <th>Uploaded Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.updated_records.map((r, i) => (
                              <tr key={i}>
                                <td style={{ textTransform: "capitalize", fontWeight: 600 }}>{r.type}</td>
                                <td style={{ fontFamily: "monospace" }}>{r.date}</td>
                                <td style={{ fontWeight: 600 }}>{r.branch || r.particulars || "Direct Income"}</td>
                                <td style={{ color: "#b91c1c", fontSize: "0.82rem" }}>
                                  {r.type === "branch"
                                    ? `Inv: ${r.old_values?.invoice_count}, Amt: ${formatINR(r.old_values?.invoice_amount)}, LRs: ${r.old_values?.pending_lrs}`
                                    : formatINR(r.old_values?.amount)}
                                </td>
                                <td style={{ color: "#15803d", fontWeight: 700, fontSize: "0.82rem" }}>
                                  {r.type === "branch"
                                    ? `Inv: ${r.new_values?.invoice_count}, Amt: ${formatINR(r.new_values?.invoice_amount)}, LRs: ${r.new_values?.pending_lrs}`
                                    : formatINR(r.new_values?.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "new" && (
                <div className="ti-card">
                  <div className="ti-card-header">
                    <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700 }}>
                      🟢 New Records to Insert
                    </h4>
                  </div>
                  <div className="ti-card-body" style={{ padding: 0 }}>
                    {previewData.new_records?.length === 0 ? (
                      <p style={{ padding: "1.5rem", margin: 0, color: "#94a3b8", textAlign: "center" }}>
                        No new records found in this upload.
                      </p>
                    ) : (
                      <div className="ti-table-responsive" style={{ maxHeight: "260px" }}>
                        <table className="ti-table">
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>Date</th>
                              <th>Target / Branch</th>
                              <th className="text-right">Amount / Metrics</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.new_records.map((r, i) => (
                              <tr key={i}>
                                <td style={{ textTransform: "capitalize", fontWeight: 600 }}>{r.type}</td>
                                <td style={{ fontFamily: "monospace" }}>{r.date}</td>
                                <td style={{ fontWeight: 600 }}>{r.branch || r.particulars || "Direct Income"}</td>
                                <td className="text-right" style={{ fontWeight: 700 }}>
                                  {r.type === "branch"
                                    ? `${r.invoice_count} inv, ${formatINR(r.invoice_amount)}, ${r.pending_lrs} LRs`
                                    : formatINR(r.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "errors" && (
                <div className="ti-card">
                  <div className="ti-card-header">
                    <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#b91c1c" }}>
                      🔴 Validation Errors
                    </h4>
                  </div>
                  <div className="ti-card-body" style={{ padding: 0 }}>
                    {previewData.errors?.length === 0 ? (
                      <p style={{ padding: "1.5rem", margin: 0, color: "#15803d", textAlign: "center" }}>
                        ✓ Zero validation errors detected! File is 100% valid.
                      </p>
                    ) : (
                      <div className="ti-table-responsive" style={{ maxHeight: "260px" }}>
                        <table className="ti-table">
                          <thead>
                            <tr>
                              <th>Sheet</th>
                              <th>Row</th>
                              <th>Error Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.errors.map((err, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{err.sheet}</td>
                                <td style={{ fontFamily: "monospace" }}>Row {err.rowNumber}</td>
                                <td style={{ color: "#b91c1c", fontWeight: 600 }}>{err.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "duplicate" && (
                <div className="ti-card">
                  <div className="ti-card-header">
                    <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700 }}>
                      ⚪ Unchanged / Duplicate Records
                    </h4>
                  </div>
                  <div className="ti-card-body" style={{ padding: 0 }}>
                    <p style={{ padding: "1rem 1.25rem", margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                      These records already match database contents identically and require no updates ({previewData.duplicate_records?.length || 0} rows).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            {previewData ? "Section 8 & 16: Review preview before confirming master update." : "Select an Excel file to begin validation."}
          </span>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              className="ti-btn ti-btn-secondary"
              onClick={onClose}
              disabled={confirming}
            >
              Cancel
            </button>
            {previewData && (
              <button
                type="button"
                className="ti-btn ti-btn-primary"
                onClick={handleConfirm}
                disabled={confirming || (previewData.summary?.new_count === 0 && previewData.summary?.updated_count === 0)}
              >
                {confirming ? "Updating Master..." : "✓ Confirm & Update Master"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
