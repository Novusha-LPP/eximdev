import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

// Icons
const IconBack = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M13 4.5L6.5 11 3 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
);

function ViewAuthorizationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [subData, setSubData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const fetchDetails = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-authorization-registrations`);
      const found = res.data.find(r => r._id === id);
      if (found) {
        setRow(found);
        setSubData({
          import_validity: found.import_validity || "",
          export_validity: found.export_validity || "",
          hs_code: found.hs_code || "",
          item_description: found.item_description || "",
          export_item_description: found.export_item_description || "",
          value_usd: found.value_usd || "",
          value_rs: found.value_rs || "",
          qty: found.qty || "",
          utilized_qty: found.utilized_qty || "",
          balance_qty: found.balance_qty || "",
          qty_uom: found.qty_uom || "",
          boe_details: found.boe_details || "",
          sb_details: found.sb_details || "",
          documents_received_date: found.documents_received_date || "",
          documents_send_to_icd: found.documents_send_to_icd || "",
          documents_send_to_account: found.documents_send_to_account || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_STRING}/update-authorization-registration/${id}`, subData);
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast("Changes saved successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message, severity) => {
    setToast({ open: true, message, severity });
    setTimeout(() => setToast({ open: false, message: "", severity: "success" }), 4000);
  };

  const handleChange = (key, val) => {
    setSubData(prev => ({ ...prev, [key]: val }));
  };

  if (loading) return <div className="ar-loading">Loading account details...</div>;
  if (!row) return <div className="ar-error">Authorization record not found.</div>;

  const jobNoClean = row.job_no ? (row.job_no.toString().includes("/") ? row.job_no : `LIC/${row.job_no}`) : "LIC/--";

  return (
    <div className="ap-details-container">
      {/* SUBHEADER */}
      <div className="ap-subheader">
        <div className="ap-subheader-left">
          <button className="ap-back-btn" onClick={() => navigate(-1)} title="Back">
            <IconBack />
          </button>
          <h1 className="ap-page-title">
            Authorization Details — <span>{jobNoClean}</span>
          </h1>
        </div>
        <div className="ap-subheader-right">
          <button 
            className="ap-btn primary" 
            onClick={handleSave} 
            disabled={saving}
          >
            <IconCheck />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="ap-content">

        {/* LICENSE HOLDER CARD */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">License Holder Information</div>
            <div className="ap-status-badge">
              <span className="ap-status-dot"></span>
              Active
            </div>
          </div>
          <div className="ap-firm-strip">
            <div className="ap-firm-cell">
              <div className="ap-firm-label">Firm Name</div>
              <div className="ap-firm-value">{row.party_name || "—"}</div>
            </div>
            <div className="ap-firm-cell">
              <div className="ap-firm-label">IEC Number</div>
              <div className="ap-firm-value mono">{row.iec_no || "—"}</div>
            </div>
            <div className="ap-firm-cell">
              <div className="ap-firm-label">Authorization Number</div>
              <div className="ap-firm-value mono">{row.licence_no || "—"}</div>
            </div>
            <div className="ap-firm-cell">
              <div className="ap-firm-label">Auth Date</div>
              <div className="ap-firm-value date">{row.licence_date || "—"}</div>
            </div>
          </div>
        </div>

        {/* VALIDITY & ITEM DETAILS CARD */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Validity & Item Details</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid">
              <div className="ap-field-group">
                <label className="ap-field-label">Import Validity</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.import_validity} 
                  onChange={(e) => handleChange("import_validity", e.target.value)}
                  placeholder="dd-mm-yyyy"
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Export Validity</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.export_validity}
                  onChange={(e) => handleChange("export_validity", e.target.value)}
                  placeholder="dd-mm-yyyy"
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">HS Code</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.hs_code}
                  onChange={(e) => handleChange("hs_code", e.target.value)}
                  placeholder="Enter HS code"
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Value USD</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.value_usd}
                  onChange={(e) => handleChange("value_usd", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="ap-field-group" style={{ gridColumn: 'span 2' }}>
                <label className="ap-field-label">Import Item Description</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.item_description}
                  onChange={(e) => handleChange("item_description", e.target.value)}
                  placeholder="Describe import item"
                />
              </div>
              <div className="ap-field-group" style={{ gridColumn: 'span 2' }}>
                <label className="ap-field-label">Export Item Description</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.export_item_description}
                  onChange={(e) => handleChange("export_item_description", e.target.value)}
                  placeholder="Describe export item"
                />
              </div>
            </div>

            <div className="ap-section-divider">
              <span>Quantity & Value</span>
            </div>

            <div className="ap-fields-grid cols-5">
              <div className="ap-field-group">
                <label className="ap-field-label">Value (₹ RS)</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.value_rs}
                  onChange={(e) => handleChange("value_rs", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Total QTY</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.qty}
                  onChange={(e) => handleChange("qty", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Utilized QTY</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.utilized_qty}
                  onChange={(e) => handleChange("utilized_qty", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Balance QTY</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.balance_qty}
                  onChange={(e) => handleChange("balance_qty", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">UOM</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.qty_uom}
                  onChange={(e) => handleChange("qty_uom", e.target.value)}
                  placeholder="e.g. KGS"
                />
              </div>
            </div>
          </div>
        </div>

        {/* DOCUMENT TRACKING CARD */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Document Tracking</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid">
              <div className="ap-field-group">
                <label className="ap-field-label">BOE Details</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.boe_details}
                  onChange={(e) => handleChange("boe_details", e.target.value)}
                  placeholder="Bill of Entry details"
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">SB Details</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.sb_details}
                  onChange={(e) => handleChange("sb_details", e.target.value)}
                  placeholder="Shipping Bill details"
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Documents Received Date</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.documents_received_date}
                  onChange={(e) => handleChange("documents_received_date", e.target.value)}
                  placeholder="dd-mm-yyyy"
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Documents Send to ICD</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.documents_send_to_icd}
                  onChange={(e) => handleChange("documents_send_to_icd", e.target.value)}
                  placeholder="dd-mm-yyyy"
                />
              </div>
              <div className="ap-field-group" style={{ gridColumn: 'span 2' }}>
                <label className="ap-field-label">Documents Send to Account</label>
                <input 
                  type="text" 
                  className="ap-field-input" 
                  value={subData.documents_send_to_account}
                  onChange={(e) => handleChange("documents_send_to_account", e.target.value)}
                  placeholder="Account reference"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="ap-footer">
        <div className="ap-footer-meta">
          <span>{jobNoClean} &nbsp;·&nbsp; {row.party_name || "—"}</span>
          <div className="ap-footer-dot"></div>
          <span>Auth: {row.licence_no || "—"}</span>
          <div className="ap-footer-dot"></div>
          <span>IEC: {row.iec_no || "—"}</span>
        </div>
        <span>Last saved: {lastSaved || "—"}</span>
      </footer>

      {/* TOAST */}
      {toast.open && (
        <div className={`dgft-toast ${toast.severity}`}>
          {toast.message}
          <button onClick={() => setToast({ ...toast, open: false })}>✕</button>
        </div>
      )}
    </div>
  );
}

export default ViewAuthorizationDetails;
