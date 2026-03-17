import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { format, addMonths, parse, isValid } from "date-fns";

// ── Icons ─────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M13 4.5L6.5 11 3 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

// ── DatePickerInput ───────────────────────────────────────────────
// Shows a text input in DD/MM/YYYY format + a calendar icon button.
// Clicking icon opens a hidden native <input type="date"> (which uses
// the browser's picker). The native input is always in YYYY-MM-DD,
// we convert back to DD/MM/YYYY for display & storage.
function DatePickerInput({ value, onChange, placeholder = "dd/mm/yyyy" }) {
  const hiddenRef = useRef(null);

  // Convert stored DD/MM/YYYY → YYYY-MM-DD for the native picker
  const toNativeValue = (ddmmyyyy) => {
    if (!ddmmyyyy) return "";
    const parts = ddmmyyyy.split("/");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      if (dd && mm && yyyy && yyyy.length === 4) return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
    }
    return "";
  };

  // Convert YYYY-MM-DD → DD/MM/YYYY
  const fromNativeValue = (yyyymmdd) => {
    if (!yyyymmdd) return "";
    const [yyyy, mm, dd] = yyyymmdd.split("-");
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleNativeChange = (e) => {
    onChange(fromNativeValue(e.target.value));
  };

  // Handle manual typing: enforce DD/MM/YYYY order with auto-slash
  const handleTextChange = (e) => {
    let raw = e.target.value.replace(/[^0-9/]/g, "");
    // Auto-insert slashes: after 2 digits (day), again after 2 more (month)
    const digits = raw.replace(/\//g, "");
    let formatted = "";
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
    onChange(formatted);
  };

  const openPicker = () => {
    if (hiddenRef.current) {
      hiddenRef.current.value = toNativeValue(value);
      hiddenRef.current.showPicker?.();
      hiddenRef.current.click();
    }
  };

  return (
    <div className="ap-date-input-wrap">
      <input
        type="text"
        className="ap-field-input ap-date-text"
        value={value || ""}
        onChange={handleTextChange}
        onDoubleClick={openPicker}
        placeholder={placeholder}
        maxLength={10}
      />
      <button type="button" className="ap-date-icon-btn" onClick={openPicker} title="Pick a date">
        <IconCalendar />
      </button>
      {/* Hidden native date picker */}
      <input
        ref={hiddenRef}
        type="date"
        className="ap-date-hidden"
        onChange={handleNativeChange}
        tabIndex={-1}
      />
    </div>
  );
}

// ── HS Code Autocomplete ──────────────────────────────────────────
function HSCodeAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchHS = async (q) => {
    if (!q || q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/search?query=${q}&addToRecent=false`);
      if (res.data?.results) { setResults(res.data.results.slice(0, 10)); setShowResults(true); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    searchHS(val);
  };

  const handleSelect = (item) => {
    setQuery(item.hs_code);
    onChange(item.hs_code);
    setShowResults(false);
  };

  return (
    <div className="ap-autocomplete-wrapper" ref={wrapperRef}>
      <div className="ap-field-input-wrap">
        <input
          type="text"
          className="ap-field-input"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 3 && setShowResults(true)}
          placeholder="Search HS Code..."
        />
        {loading && <div className="ap-field-loader"></div>}
      </div>
      {showResults && results.length > 0 && (
        <ul className="ap-autocomplete-results">
          {results.map((item, idx) => (
            <li key={idx} onClick={() => handleSelect(item)}>
              <div className="ap-res-code">{item.hs_code}</div>
              <div className="ap-res-desc">{item.item_description}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Safely convert any value to a plain string — handles Mongoose objects, Dates, nulls, etc.
const safeStr = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (val instanceof Date) return format(val, "dd/MM/yyyy");
  if (typeof val === "number") return String(val);
  // Object (Mongoose Date / subdocument) → try to extract a string
  if (typeof val === "object") {
    // If it has a string representation that isn't "[object Object]"
    if (val.$date) return safeStr(new Date(val.$date));
    const str = String(val);
    return str === "[object Object]" ? "" : str;
  }
  return String(val);
};

// ── Main Component ────────────────────────────────────────────────
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
        let sub = {
          import_validity:            safeStr(found.import_validity),
          export_validity:            safeStr(found.export_validity),
          hs_code_import:             safeStr(found.hs_code_import || found.hs_code),
          export_hs_code:             safeStr(found.export_hs_code),
          import_item_description:    safeStr(found.import_item_description || found.item_description),
          export_item_description:    safeStr(found.export_item_description),
          import_qty:                 safeStr(found.import_qty || found.qty),
          export_qty:                 safeStr(found.export_qty),
          balance_qty_import:         safeStr(found.balance_qty_import || found.balance_qty),
          balance_qty_export:         safeStr(found.balance_qty_export),
          utilisation_details_import: safeStr(found.utilisation_details_import || found.boe_details),
          utilisation_details_export: safeStr(found.utilisation_details_export || found.sb_details),
          import_value_usd:           safeStr(found.import_value_usd || found.value_usd),
          import_value_rs:            safeStr(found.import_value_rs || found.value_rs),
          export_value_usd:           safeStr(found.export_value_usd),
          export_value_rs:            safeStr(found.export_value_rs),
          bg_expiry_date:             safeStr(found.bg_expiry_date),
          bond_expiry_date:           safeStr(found.bond_expiry_date),
          documents_received_date:    safeStr(found.documents_received_date),
          documents_send_to_icd:      safeStr(found.documents_send_to_icd),
          documents_send_to_accounts: safeStr(found.documents_send_to_accounts || found.documents_send_to_account),
        };

        // Auto-fill validity from licence_date (DD/MM/YYYY)
        if (found.licence_date) {
          try {
            const authDate = parse(found.licence_date, "dd/MM/yyyy", new Date());
            if (isValid(authDate)) {
              if (!sub.import_validity) sub.import_validity = format(addMonths(authDate, 12), "dd/MM/yyyy");
              if (!sub.export_validity) sub.export_validity = format(addMonths(authDate, 18), "dd/MM/yyyy");
            }
          } catch (e) { /* skip */ }
        }

        setSubData(sub);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_STRING}/update-authorization-registration/${id}`, subData);
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
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

  const hc = (key, val) => setSubData(prev => ({ ...prev, [key]: val }));

  if (loading) return <div className="ar-loading">Loading authorization details...</div>;
  if (!row)    return <div className="ar-error">Authorization record not found.</div>;

  const jobNoClean = row.job_no
    ? (row.job_no.toString().includes("/") ? row.job_no : `LIC/${row.job_no}`)
    : "LIC/--";

  return (
    <div className="ap-details-container">
      {/* ── SUBHEADER ─────────────────────────── */}
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
          <span className="ap-last-saved">{lastSaved ? `Saved at ${lastSaved}` : ""}</span>
          <button className="ap-btn primary" onClick={handleSave} disabled={saving}>
            <IconCheck />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────── */}
      <div className="ap-content">

        {/* General Info */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">General Information</div>
            <div className={`ap-status-badge ${row.job_status?.toLowerCase() === "completed" ? "success" : "pending"}`}>
              {row.job_status || "Pending"}
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

        {/* Validity, Item & HS Code */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Validity, Item &amp; HS Code</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid cols-2">
              <div className="ap-field-group">
                <label className="ap-field-label">Import Validity (12 months auto)</label>
                <DatePickerInput value={subData.import_validity} onChange={v => hc("import_validity", v)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Export Validity (18 months auto)</label>
                <DatePickerInput value={subData.export_validity} onChange={v => hc("export_validity", v)} />
              </div>
            </div>
            
            <div className="ap-fields-grid cols-2" style={{ marginTop: 16 }}>
              <div className="ap-field-group">
                <label className="ap-field-label">HS Code (Import)</label>
                <HSCodeAutocomplete value={subData.hs_code_import} onChange={v => hc("hs_code_import", v)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Item Description (Import)</label>
                <textarea className="ap-field-textarea" value={subData.import_item_description}
                  onChange={e => hc("import_item_description", e.target.value)}
                  placeholder="Enter import item description..." rows={1} />
              </div>
            </div>

            <div className="ap-fields-grid cols-2" style={{ marginTop: 16 }}>
              <div className="ap-field-group">
                <label className="ap-field-label">HS Code (Export)</label>
                <HSCodeAutocomplete value={subData.export_hs_code} onChange={v => hc("export_hs_code", v)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Item Description (Export)</label>
                <textarea className="ap-field-textarea" value={subData.export_item_description}
                  onChange={e => hc("export_item_description", e.target.value)}
                  placeholder="Enter export item description..." rows={1} />
              </div>
            </div>
          </div>
        </div>

        {/* Quantity & Value */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Quantity &amp; Value Tracking</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-section-subtitle">Import Details</div>
            <div className="ap-fields-grid cols-4">
              <div className="ap-field-group">
                <label className="ap-field-label">Qty (Import)</label>
                <input type="text" className="ap-field-input" value={subData.import_qty}
                  onChange={e => hc("import_qty", e.target.value)} placeholder="0.00" />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Balance Qty (DSR Import)</label>
                <input type="text" className="ap-field-input" value={subData.balance_qty_import}
                  onChange={e => hc("balance_qty_import", e.target.value)} placeholder="0.00" />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Import Value (CIF USD)</label>
                <input type="text" className="ap-field-input" value={subData.import_value_usd}
                  onChange={e => hc("import_value_usd", e.target.value)} placeholder="0.00" />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Import Value (CIF Rs)</label>
                <input type="text" className="ap-field-input" value={subData.import_value_rs}
                  onChange={e => hc("import_value_rs", e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="ap-field-group mt-12">
              <label className="ap-field-label">Utilisation Details (BOE from DSR Import)</label>
              <input type="text" className="ap-field-input" value={subData.utilisation_details_import}
                onChange={e => hc("utilisation_details_import", e.target.value)} placeholder="Enter utilisation details..." />
            </div>

            <div className="ap-section-subtitle mt-20">Export Details</div>
            <div className="ap-fields-grid cols-4">
              <div className="ap-field-group">
                <label className="ap-field-label">Qty (Export)</label>
                <input type="text" className="ap-field-input" value={subData.export_qty}
                  onChange={e => hc("export_qty", e.target.value)} placeholder="0.00" />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Balance Qty (DSR Export)</label>
                <input type="text" className="ap-field-input" value={subData.balance_qty_export}
                  onChange={e => hc("balance_qty_export", e.target.value)} placeholder="0.00" />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Export Value (FOB USD)</label>
                <input type="text" className="ap-field-input" value={subData.export_value_usd}
                  onChange={e => hc("export_value_usd", e.target.value)} placeholder="0.00" />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Export Value (FOB Rs)</label>
                <input type="text" className="ap-field-input" value={subData.export_value_rs}
                  onChange={e => hc("export_value_rs", e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="ap-field-group mt-12">
              <label className="ap-field-label">Utilisation Details (BOE from DSR Export)</label>
              <input type="text" className="ap-field-input" value={subData.utilisation_details_export}
                onChange={e => hc("utilisation_details_export", e.target.value)} placeholder="Enter utilisation details..." />
            </div>
          </div>
        </div>

        {/* Compliance & Documents */}
        <div className="ap-card" style={{ marginBottom: 80 }}>
          <div className="ap-card-header">
            <div className="ap-card-title">Compliance &amp; Document Tracking</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid cols-3">
              <div className="ap-field-group">
                <label className="ap-field-label">BG Expiry Date</label>
                <DatePickerInput value={subData.bg_expiry_date} onChange={v => hc("bg_expiry_date", v)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Bond Expiry Date</label>
                <DatePickerInput value={subData.bond_expiry_date} onChange={v => hc("bond_expiry_date", v)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Documents Received Date</label>
                <DatePickerInput value={subData.documents_received_date} onChange={v => hc("documents_received_date", v)} />
              </div>
            </div>
            <div className="ap-fields-grid cols-2 mt-12">
              <div className="ap-field-group">
                <label className="ap-field-label">Documents Sent to ICD</label>
                <DatePickerInput value={subData.documents_send_to_icd} onChange={v => hc("documents_send_to_icd", v)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Documents Date Send to Accounts</label>
                <DatePickerInput value={subData.documents_send_to_accounts} onChange={v => hc("documents_send_to_accounts", v)} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── FLOATING SAVE BUTTON ──────────────── */}
      <div className="ap-floating-save">
        <span className="ap-floating-save-meta">{lastSaved ? `Last saved at ${lastSaved}` : "Unsaved changes"}</span>
        <button className="ap-btn primary ap-floating-btn" onClick={handleSave} disabled={saving}>
          <IconCheck />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* ── FOOTER ───────────────────────────── */}
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

      {/* ── TOAST ───────────────────────────── */}
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
