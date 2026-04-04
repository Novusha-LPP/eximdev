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

// ── Unit Autocomplete ──────────────────────────────────────────
export const unitCodes = [
  "BAG", "BGS", "BLS", "BRL", "BTL", "BOX", "BLK", "CAN", "CAR", "CRY", "CTN", "CMS", "CHI", "COL", "CON", "CRI", "CCM", "CFT", "CBI", "CBM", "CYL", "DOZ", "DRM", "FLK", "FOT", "FUT", "GMS", "GRS", "FBK", "INC", "NGT", "JTA", "JAL", "KEG", "KLT", "KGS", "KME", "KIT", "LTR", "LOG", "TON", "MTR", "MTS", "MGS", "MOU", "NOS", "NHM", "THD", "PKG", "PAC", "PAI", "PRS", "PLT", "PCS", "PNT", "PND", "QDS", "QTL", "REL", "ROL", "SET", "SKD", "SLB", "SQF", "SQM", "SQY", "BLO", "BUL", "ENV", "TBL", "TNK", "TGM", "TIN", "TRK", "UNT", "UGS", "CSK", "YDS",
];

function UnitAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
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

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    onChange(val);
    if (val.trim()) {
      const filtered = unitCodes.filter(c => c.includes(val)).slice(0, 10);
      setResults(filtered);
      setShowResults(true);
    } else {
      const first10 = unitCodes.slice(0, 10);
      setResults(first10);
      setShowResults(true);
    }
  };

  const handleSelect = (code) => {
    setQuery(code);
    onChange(code);
    setShowResults(false);
  };

  return (
    <div className="ap-autocomplete-wrapper" ref={wrapperRef}>
      <input
        type="text"
        className="ap-field-input"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          const val = query.trim().toUpperCase();
          const filtered = val ? unitCodes.filter(c => c.includes(val)).slice(0, 10) : unitCodes.slice(0, 10);
          setResults(filtered);
          setShowResults(true);
        }}
        placeholder="Unit"
      />
      {showResults && results.length > 0 && (
        <ul className="ap-autocomplete-results">
          {results.map((code, idx) => (
            <li key={idx} onClick={() => handleSelect(code)}>
              <div className="ap-res-code">{code}</div>
            </li>
          ))}
        </ul>
      )}
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
      if (err?.response?.status !== 404) console.error(err);
      setResults([]);
      setShowResults(false);
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
          import_unit:                safeStr(found.import_unit),
          export_qty:                 safeStr(found.export_qty),
          export_unit:                safeStr(found.export_unit),
          balance_qty_import:         safeStr(found.balance_qty_import || found.balance_qty),
          balance_import_unit:        safeStr(found.balance_import_unit),
          balance_qty_export:         safeStr(found.balance_qty_export),
          balance_export_unit:        safeStr(found.balance_export_unit),
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
          bg_number:                  safeStr(found.bg_number),
          bond_number:                safeStr(found.bond_number),
          registration_no:            safeStr(found.registration_no || found.licence_no),
          auth_date:                  safeStr(found.auth_date || found.licence_date),
          scheme_code:                safeStr(found.scheme_code),
          notification_number:        safeStr(found.notification_number),
          be_details:                 Array.isArray(found.be_details) ? found.be_details : [],
          import_details_array:       Array.isArray(found.import_details_array) && found.import_details_array.length > 0
                                        ? found.import_details_array
                                        : [{
                                            item_description: safeStr(found.import_item_description || found.item_description),
                                            hs_code: safeStr(found.hs_code_import || found.hs_code),
                                            qty: safeStr(found.import_qty || found.qty),
                                            unit: safeStr(found.import_unit),
                                            balance_qty: safeStr(found.balance_qty_import || found.balance_qty),
                                            balance_unit: safeStr(found.balance_import_unit),
                                            value_usd: safeStr(found.import_value_usd || found.value_usd),
                                            value_rs: safeStr(found.import_value_rs || found.value_rs),
                                          }],
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

  const handleBeDetailChange = (index, field, value) => {
    const newBeDetails = [...(subData.be_details || [])];
    newBeDetails[index] = { ...newBeDetails[index], [field]: value };
    setSubData(prev => ({ ...prev, be_details: newBeDetails }));
  };

  const addBeDetail = () => {
    const newBeDetails = [...(subData.be_details || []), { sr_no: '', item: '', be_no: '', be_date: '', qty: '', unit: '', cif_inr: '', cif_usd: '', port: '' }];
    setSubData(prev => ({ ...prev, be_details: newBeDetails }));
  };

  const removeBeDetail = (index) => {
    const newBeDetails = [...(subData.be_details || [])];
    newBeDetails.splice(index, 1);
    setSubData(prev => ({ ...prev, be_details: newBeDetails }));
  };

  const handleImportDetailChange = (index, field, value) => {
    const newDetails = [...(subData.import_details_array || [])];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setSubData(prev => ({ ...prev, import_details_array: newDetails }));
  };

  const addImportDetail = () => {
    const newDetails = [...(subData.import_details_array || []), {
      item_description: '', hs_code: '', qty: '', unit: '', balance_qty: '', balance_unit: '', value_usd: '', value_rs: ''
    }];
    setSubData(prev => ({ ...prev, import_details_array: newDetails }));
  };

  const removeImportDetail = (index) => {
    const newDetails = [...(subData.import_details_array || [])];
    newDetails.splice(index, 1);
    setSubData(prev => ({ ...prev, import_details_array: newDetails }));
  };

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
        {/* <div className="ap-subheader-right">
          <span className="ap-last-saved">{lastSaved ? `Saved at ${lastSaved}` : ""}</span>
          <button className="ap-btn primary" onClick={handleSave} disabled={saving}>
            <IconCheck />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div> */}
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
          </div>
        </div>
   {/* Compliance & Documents */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Compliance &amp; Document Tracking</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid cols-2">
              <div className="ap-field-group">
                <label className="ap-field-label">BG Number</label>
                <input type="text" className="ap-field-input" value={subData.bg_number}
                  onChange={e => hc("bg_number", e.target.value)} placeholder="Enter BG number" />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">BG Expiry Date</label>
                <DatePickerInput value={subData.bg_expiry_date} onChange={v => hc("bg_expiry_date", v)} />
              </div>
            </div>

            <div className="ap-fields-grid cols-2 mt-12">
              <div className="ap-field-group">
                <label className="ap-field-label">Bond Number</label>
                <input type="text" className="ap-field-input" value={subData.bond_number}
                  onChange={e => hc("bond_number", e.target.value)} placeholder="Enter Bond number" />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Bond Expiry Date</label>
                <DatePickerInput value={subData.bond_expiry_date} onChange={v => hc("bond_expiry_date", v)} />
              </div>
            </div>

            <div className="ap-fields-grid cols-3 mt-12">
              <div className="ap-field-group">
                <label className="ap-field-label">Documents Received Date</label>
                <DatePickerInput value={subData.documents_received_date} onChange={v => hc("documents_received_date", v)} />
              </div>
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
        {/* Quantity & Value */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Quantity &amp; Value Tracking</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-section-subtitle">Export Details</div>
            <div className="ap-fields-grid cols-3">
              <div className="ap-field-group">
                <label className="ap-field-label">Qty (Export)</label>
                <div style={{ display: "flex", gap: "4px" }}>
                  <input type="text" className="ap-field-input" value={subData.export_qty}
                    onChange={e => hc("export_qty", e.target.value)} placeholder="0.00" style={{ flex: 2 }} />
                  <div style={{ flex: 1 }}>
                    <UnitAutocomplete value={subData.export_unit} onChange={v => hc("export_unit", v)} />
                  </div>
                </div>
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Balance Qty (DSR Export)</label>
                <div style={{ display: "flex", gap: "4px" }}>
                  <input type="text" className="ap-field-input" value={subData.balance_qty_export}
                    onChange={e => hc("balance_qty_export", e.target.value)} placeholder="0.00" style={{ flex: 2 }} />
                  <div style={{ flex: 1 }}>
                    <UnitAutocomplete value={subData.balance_export_unit} onChange={v => hc("balance_export_unit", v)} />
                  </div>
                </div>
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
              <div className="ap-field-group">
                <label className="ap-field-label">HS Code (Export)</label>
                <HSCodeAutocomplete value={subData.export_hs_code} onChange={v => hc("export_hs_code", v)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Item Description (Export)</label>
                <textarea className="ap-field-textarea" value={subData.export_item_description}
                  onChange={e => hc("export_item_description", e.target.value)}
                  placeholder="Enter export item description..." rows={3} style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div className="ap-section-subtitle mt-20" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span>Import Details</span>
            </div>
            {(subData.import_details_array || []).map((row, idx) => (
              <div key={idx} style={{ position: 'relative', background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div style={{ fontWeight: '600', color: '#475569', fontSize: '15px' }}>Item #{idx + 1}</div>
                  {idx > 0 && (
                    <button type="button" onClick={() => removeImportDetail(idx)} style={{ color: '#ef4444', cursor: 'pointer', background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: '500', fontSize: '12px', transition: 'background 0.2s' }}>
                      ✕ Remove Row
                    </button>
                  )}
                </div>
                <div className="ap-fields-grid cols-3">
                  <div className="ap-field-group">
                    <label className="ap-field-label">Item Description (Import)</label>
                    <textarea className="ap-field-textarea" value={row.item_description}
                      onChange={e => handleImportDetailChange(idx, "item_description", e.target.value)}
                      placeholder="Enter import item description..." rows={3} style={{ resize: 'vertical' }} />
                  </div>
                  <div className="ap-field-group">
                    <label className="ap-field-label">HS Code (Import)</label>
                    <HSCodeAutocomplete value={row.hs_code} onChange={v => handleImportDetailChange(idx, "hs_code", v)} />
                  </div>
                  <div className="ap-field-group">
                    <label className="ap-field-label">Qty (Import)</label>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <input type="text" className="ap-field-input" value={row.qty}
                        onChange={e => handleImportDetailChange(idx, "qty", e.target.value)} placeholder="0.00" style={{ flex: 2 }} />
                      <div style={{ flex: 1 }}>
                        <UnitAutocomplete value={row.unit} onChange={v => handleImportDetailChange(idx, "unit", v)} />
                      </div>
                    </div>
                  </div>
                  <div className="ap-field-group">
                    <label className="ap-field-label">Balance Qty (DSR Import)</label>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <input type="text" className="ap-field-input" value={row.balance_qty}
                        onChange={e => handleImportDetailChange(idx, "balance_qty", e.target.value)} placeholder="0.00" style={{ flex: 2 }} />
                      <div style={{ flex: 1 }}>
                        <UnitAutocomplete value={row.balance_unit} onChange={v => handleImportDetailChange(idx, "balance_unit", v)} />
                      </div>
                    </div>
                  </div>
                  <div className="ap-field-group">
                    <label className="ap-field-label">Import Value (CIF USD)</label>
                    <input type="text" className="ap-field-input" value={row.value_usd}
                      onChange={e => handleImportDetailChange(idx, "value_usd", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="ap-field-group">
                    <label className="ap-field-label">Import Value (CIF Rs)</label>
                    <input type="text" className="ap-field-input" value={row.value_rs}
                      onChange={e => handleImportDetailChange(idx, "value_rs", e.target.value)} placeholder="0.00" />
                  </div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 0 }}>
              <button type="button" className="ap-btn secondary" onClick={addImportDetail} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}>+ Add Import Item</button>
            </div>
          </div>
        </div>

        {/* New DB Table Section */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Utilisation Details</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-field-group mb-20" style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
              <label className="ap-field-label" style={{ fontWeight: '600', color: '#1e293b' }}>Utilisation Details (BOE from DSR Import)</label>
              <input type="text" className="ap-field-input" value={subData.utilisation_details_import}
                onChange={e => hc("utilisation_details_import", e.target.value)} placeholder="Enter utilisation details..." style={{ background: '#f8f9fa' }} />
            </div>

            <div className="ap-fields-grid cols-4 mb-20" style={{ marginBottom: 20 }}>
              <div className="ap-field-group">
                <label className="ap-field-label">Registration No. (Auth No.)</label>
                <input type="text" className="ap-field-input" value={subData.registration_no}
                  onChange={e => hc("registration_no", e.target.value)} placeholder="Registration Number" />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Auth Date</label>
                <DatePickerInput value={subData.auth_date} onChange={v => hc("auth_date", v)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Scheme Code</label>
                <input type="text" className="ap-field-input" value={subData.scheme_code}
                  onChange={e => hc("scheme_code", e.target.value)} placeholder="Scheme Code" />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Notification Number</label>
                <input type="text" className="ap-field-input" value={subData.notification_number}
                  onChange={e => hc("notification_number", e.target.value)} placeholder="Notification Number" />
              </div>
            </div>
            
            <div className="ap-table-responsive" style={{ overflowX: 'auto', minHeight: '250px' }}>
              <table className="ap-table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <th style={{ padding: '8px' }}>Sr No.</th>
                    <th style={{ padding: '8px' }}>ITEM</th>
                    <th style={{ padding: '8px' }}>BE No.</th>
                    <th style={{ padding: '8px' }}>BE Date</th>
                    <th style={{ padding: '8px' }}>Qty</th>
                    <th style={{ padding: '8px' }}>Unit</th>
                    <th style={{ padding: '8px' }}>CIF INR</th>
                    <th style={{ padding: '8px' }}>CIF USD</th>
                    <th style={{ padding: '8px' }}>PORT</th>
                    {/* <th style={{ padding: '8px' }}>Actions</th> */}
                  </tr>
                </thead>
                <tbody>
                  {(subData.be_details || []).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '4px' }}>
                        <input type="text" className="ap-field-input" value={row.sr_no} onChange={e => handleBeDetailChange(idx, 'sr_no', e.target.value)} style={{ padding: '6px' }} />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input type="text" className="ap-field-input" value={row.item} onChange={e => handleBeDetailChange(idx, 'item', e.target.value)} style={{ padding: '6px' }} />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input type="text" className="ap-field-input" value={row.be_no} onChange={e => handleBeDetailChange(idx, 'be_no', e.target.value)} style={{ padding: '6px' }} />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <DatePickerInput value={row.be_date} onChange={v => handleBeDetailChange(idx, 'be_date', v)} placeholder="" />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input type="text" className="ap-field-input" value={row.qty} onChange={e => handleBeDetailChange(idx, 'qty', e.target.value)} style={{ padding: '6px' }} />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <UnitAutocomplete value={row.unit} onChange={v => handleBeDetailChange(idx, 'unit', v)} />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input type="text" className="ap-field-input" value={row.cif_inr} onChange={e => handleBeDetailChange(idx, 'cif_inr', e.target.value)} style={{ padding: '6px' }} />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input type="text" className="ap-field-input" value={row.cif_usd} onChange={e => handleBeDetailChange(idx, 'cif_usd', e.target.value)} style={{ padding: '6px' }} />
                      </td>
                      <td style={{ padding: '4px' }}>
                        <input type="text" className="ap-field-input" value={row.port} onChange={e => handleBeDetailChange(idx, 'port', e.target.value)} style={{ padding: '6px' }} />
                      </td>
                      {/* <td style={{ padding: '4px', textAlign: 'center' }}>
                        <button type="button" onClick={() => removeBeDetail(idx)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold' }}>✕</button>
                      </td> */}
                    </tr>
                  ))}
                  {!(subData.be_details?.length) && (
                    <tr>
                      <td colSpan="10" style={{ padding: '12px', textAlign: 'center', color: '#666' }}>No records added</td>
                    </tr>
                  )}
                </tbody>
              </table>
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
