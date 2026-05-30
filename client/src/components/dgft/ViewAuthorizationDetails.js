import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { format, addMonths, parse, parseISO, isValid } from "date-fns";
import { printAuthorizationPDF } from "../../utils/printAuthorizationPDF";


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

const parseFlexibleDate = (val) => {
  if (!val) return null;
  if (val instanceof Date && isValid(val)) return val;

  const raw = safeStr(val).trim();
  if (!raw) return null;

  const ddmmyyyy = parse(raw, "dd/MM/yyyy", new Date());
  if (isValid(ddmmyyyy) && format(ddmmyyyy, "dd/MM/yyyy") === raw) return ddmmyyyy;

  const yyyymmdd = parse(raw, "yyyy-MM-dd", new Date());
  if (isValid(yyyymmdd) && format(yyyymmdd, "yyyy-MM-dd") === raw) return yyyymmdd;

  const isoDate = parseISO(raw);
  if (isValid(isoDate)) return isoDate;

  return null;
};

const toDisplayDate = (val) => {
  const date = parseFlexibleDate(val);
  return date ? format(date, "dd/MM/yyyy") : safeStr(val);
};

const mapRecordToSubData = (found) => {
  if (!found) return {};
  let sub = {
    import_validity:            toDisplayDate(found.import_validity),
    export_validity:            toDisplayDate(found.export_validity),
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
    bg_amount:                  safeStr(found.bg_amount),
    bond_number:                safeStr(found.bond_number),
    bond_amount:                safeStr(found.bond_amount),
    accounts_billing_invoice_no: safeStr(found.accounts_billing_invoice_no),
    accounts_billing_invoice_date: safeStr(found.accounts_billing_invoice_date),
    registration_no:            safeStr(found.registration_no || found.licence_no),
    auth_date:                  toDisplayDate(found.auth_date || found.licence_date),
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
    export_details_array:       Array.isArray(found.export_details_array) && found.export_details_array.length > 0
                                  ? found.export_details_array
                                  : [{
                                      item_description: safeStr(found.export_item_description),
                                      hs_code: safeStr(found.export_hs_code),
                                      qty: safeStr(found.export_qty),
                                      unit: safeStr(found.export_unit),
                                      balance_qty: safeStr(found.balance_qty_export),
                                      balance_unit: safeStr(found.balance_export_unit),
                                      value_usd: safeStr(found.export_value_usd),
                                      value_rs: safeStr(found.export_value_rs),
                                    }],
    utilization_records:        Array.isArray(found.utilization_records) ? found.utilization_records : [],
  };

  // Auto-fill validity from licence_date (DD/MM/YYYY)
  if (found.licence_date) {
    try {
      const authDate = parseFlexibleDate(found.licence_date);
      if (isValid(authDate)) {
        if (!sub.import_validity) sub.import_validity = format(addMonths(authDate, 12), "dd/MM/yyyy");
        if (!sub.export_validity) sub.export_validity = format(addMonths(authDate, 18), "dd/MM/yyyy");
      }
    } catch (e) { /* skip */ }
  }
  return sub;
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
        
        // Fetch utilization records from the new collection
        const authNo = found.registration_no || found.licence_no;
        let records = [];
        if (authNo) {
          try {
            const recordsRes = await axios.get(
              `${process.env.REACT_APP_API_STRING}/license-utilization/records`,
              { params: { authorization_no: authNo } }
            );
            records = recordsRes.data || [];
          } catch (err) {
            console.error("Error fetching utilization records:", err);
          }
        }
        
        const sub = mapRecordToSubData({ ...found, utilization_records: records });
        setSubData(sub);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const rowRef = useRef(row);
  useEffect(() => {
    rowRef.current = row;
  }, [row]);

  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connectWebSocket = () => {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      let host = window.location.host;
      if (process.env.REACT_APP_API_STRING) {
        try {
          const url = new URL(process.env.REACT_APP_API_STRING);
          host = url.host;
        } catch(e) {}
      }

      ws = new WebSocket(`${proto}://${host}/dgft-license`);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'recalculated') {
            const currentAuth = rowRef.current;
            const authNo = currentAuth?.registration_no || currentAuth?.licence_no;
            if (authNo && (
              payload.authorizationNo === authNo || 
              String(payload.authorizationNo).trim() === String(authNo).trim()
            )) {
              console.log("[DgftWebSocket] Received update event, fetching latest details...");
              fetchDetails();
            }
          }
        } catch (e) {
          console.error("[DgftWebSocket] Error parsing message:", e);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchDetails]);

  const getItemStatus = (item) => {
    if (item.status) return item.status;
    
    // Fallback calculation
    const qtyVal = parseFloat(item.qty) || 0;
    const utilizedQtyVal = parseFloat(item.total_utilized_qty) || 0;
    
    let isExpired = false;
    if (subData.import_validity) {
      try {
        const parts = subData.import_validity.split("/");
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          const expiryDate = new Date(`${yyyy}-${mm}-${dd}T23:59:59`);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (today > expiryDate) isExpired = true;
        }
      } catch (e) {}
    }

    if (isExpired) return "Expired";
    if (utilizedQtyVal >= qtyVal && qtyVal > 0) return "Fully Utilized";
    if (utilizedQtyVal > 0) return "Partially Utilized";
    return "Available";
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...subData,
        import_details_array: (subData.import_details_array || []).map((item, index) => ({
          ...item,
          sr_no: index + 1,
        })),
        export_details_array: (subData.export_details_array || []).map((item, index) => ({
          ...item,
          sr_no: index + 1,
        })),
      };
      const res = await axios.put(`${process.env.REACT_APP_API_STRING}/update-authorization-registration/${id}`, payload);
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      showToast("Changes saved successfully", "success");
      if (res.data?.data) {
        setRow(res.data.data);
        
        // Fetch utilization records from the new collection
        const authNo = res.data.data.registration_no || res.data.data.licence_no;
        let records = [];
        if (authNo) {
          try {
            const recordsRes = await axios.get(
              `${process.env.REACT_APP_API_STRING}/license-utilization/records`,
              { params: { authorization_no: authNo } }
            );
            records = recordsRes.data || [];
          } catch (err) {
            console.error("Error fetching utilization records:", err);
          }
        }
        
        const sub = mapRecordToSubData({ ...res.data.data, utilization_records: records });
        setSubData(sub);
      } else {
        setSubData(payload);
      }
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

  const handleExportDetailChange = (index, field, value) => {
    const newDetails = [...(subData.export_details_array || [])];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setSubData(prev => ({ ...prev, export_details_array: newDetails }));
  };

  const addExportDetail = () => {
    const newDetails = [...(subData.export_details_array || []), {
      item_description: '', hs_code: '', qty: '', unit: '', balance_qty: '', balance_unit: '', value_usd: '', value_rs: ''
    }];
    setSubData(prev => ({ ...prev, export_details_array: newDetails }));
  };

  const removeExportDetail = (index) => {
    const newDetails = [...(subData.export_details_array || [])];
    newDetails.splice(index, 1);
    setSubData(prev => ({ ...prev, export_details_array: newDetails }));
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
        <div className="ap-subheader-right">
          <button className="ap-btn secondary" onClick={() => printAuthorizationPDF(row, subData)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print Report
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
              <div className="ap-firm-value date">{toDisplayDate(row.licence_date) || "—"}</div>
            </div>
          </div>
        </div>

        {/* ── KPI SUMMARY CARDS ── */}
        {(() => {
          const totalLicensedQty = (subData.import_details_array || []).reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
          const totalUtilizedQty = (subData.import_details_array || []).reduce((sum, item) => sum + (parseFloat(item.total_utilized_qty) || 0), 0);
          const totalBalanceQty = Math.max(0, totalLicensedQty - totalUtilizedQty);

          const totalLicensedUSD = (subData.import_details_array || []).reduce((sum, item) => sum + (parseFloat(item.value_usd) || 0), 0);
          const totalUtilizedUSD = (subData.import_details_array || []).reduce((sum, item) => sum + (parseFloat(item.total_utilized_usd) || 0), 0);
          const totalBalanceUSD = Math.max(0, totalLicensedUSD - totalUtilizedUSD);

          const totalUtilizationPercent = totalLicensedQty > 0 
            ? Math.min(100, Math.round((totalUtilizedQty / totalLicensedQty) * 100))
            : 0;
          const totalAvailablePercent = Math.max(0, 100 - totalUtilizationPercent);

          return (
            <>
              <div className="ap-kpi-grid">
                <div className="ap-kpi-card licensed">
                  <div className="ap-kpi-header">
                    <span className="ap-kpi-title">Licensed</span>
                  </div>
                  <div className="ap-kpi-value-group">
                    <div className="ap-kpi-metric">
                      <span className="ap-kpi-val">{totalLicensedQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                      <span className="ap-kpi-unit">Qty</span>
                    </div>
                    <div className="ap-kpi-metric">
                      <span className="ap-kpi-val">${totalLicensedUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                      <span className="ap-kpi-unit">CIF USD</span>
                    </div>
                  </div>
                </div>

                <div className="ap-kpi-card utilized">
                  <div className="ap-kpi-header">
                    <span className="ap-kpi-title">Utilized</span>
                    <span className="ap-kpi-badge">{totalUtilizationPercent}%</span>
                  </div>
                  <div className="ap-kpi-value-group">
                    <div className="ap-kpi-metric">
                      <span className="ap-kpi-val">{totalUtilizedQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                      <span className="ap-kpi-unit">Qty</span>
                    </div>
                    <div className="ap-kpi-metric">
                      <span className="ap-kpi-val">${totalUtilizedUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                      <span className="ap-kpi-unit">CIF USD</span>
                    </div>
                  </div>
                </div>

                <div className="ap-kpi-card balance">
                  <div className="ap-kpi-header">
                    <span className="ap-kpi-title">Balance</span>
                    <span className="ap-kpi-badge">{totalAvailablePercent}%</span>
                  </div>
                  <div className="ap-kpi-value-group">
                    <div className="ap-kpi-metric">
                      <span className="ap-kpi-val">{totalBalanceQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                      <span className="ap-kpi-unit">Qty</span>
                    </div>
                    <div className="ap-kpi-metric">
                      <span className="ap-kpi-val">${totalBalanceUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                      <span className="ap-kpi-unit">CIF USD</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ap-card progress-card" style={{ marginBottom: '12px' }}>
                <div className="ap-progress-info">
                  <span>{totalUtilizationPercent}% Utilized</span>
                  <span>{totalAvailablePercent}% Available</span>
                </div>
                <div className="ap-progress-bar-container">
                  <div className="ap-progress-bar-fill" style={{ width: `${totalUtilizationPercent}%` }}></div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Validity, Item & HS Code */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Validity, Item &amp; HS Code</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid cols-4">
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
          <div className="ap-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Bank Guarantee Details */}
            <div>
              <div className="ap-section-subtitle" style={{ marginBottom: '12px' }}>Bank Guarantee (BG) Details</div>
              <div className="ap-fields-grid cols-4">
                <div className="ap-field-group">
                  <label className="ap-field-label">BG Number</label>
                  <input type="text" className="ap-field-input" value={subData.bg_number || ""}
                    onChange={e => hc("bg_number", e.target.value)} placeholder="Enter BG number" />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">BG Expiry Date</label>
                  <DatePickerInput value={subData.bg_expiry_date} onChange={v => hc("bg_expiry_date", v)} />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">BG Amount</label>
                  <input type="text" className="ap-field-input" value={subData.bg_amount || ""}
                    onChange={e => hc("bg_amount", e.target.value)} placeholder="Enter BG amount" />
                </div>
              </div>
            </div>

            {/* Bond Details */}
            <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "12px" }}>
              <div className="ap-section-subtitle" style={{ marginBottom: '12px' }}>Bond Details</div>
              <div className="ap-fields-grid cols-4">
                <div className="ap-field-group">
                  <label className="ap-field-label">Bond Number</label>
                  <input type="text" className="ap-field-input" value={subData.bond_number || ""}
                    onChange={e => hc("bond_number", e.target.value)} placeholder="Enter Bond number" />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">Bond Expiry Date</label>
                  <DatePickerInput value={subData.bond_expiry_date} onChange={v => hc("bond_expiry_date", v)} />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">Bond Amount</label>
                  <input type="text" className="ap-field-input" value={subData.bond_amount || ""}
                    onChange={e => hc("bond_amount", e.target.value)} placeholder="Enter Bond amount" />
                </div>
              </div>
            </div>

            {/* Document Tracking Details */}
            <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "12px" }}>
              <div className="ap-section-subtitle" style={{ marginBottom: '12px' }}>Document Tracking &amp; Scheme Info</div>
              <div className="ap-fields-grid cols-4">
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
                <div className="ap-field-group">
                  <label className="ap-field-label">Scheme Code</label>
                  <select className="ap-field-input" value={subData.scheme_code || ""} onChange={e => hc("scheme_code", e.target.value)} style={{ padding: '6px' }}>
                    <option value="">Select Scheme</option>
                    {["Full Duty", "DEEC", "EPCG", "RODTEP", "ROSCTL", "TQ", "SIL", "SEZ", "EOU", "DFIA", "Jobbing"].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Accounts Billing Details */}
            <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "12px" }}>
              <div className="ap-section-subtitle" style={{ marginBottom: '12px' }}>Accounts &amp; Billing Info</div>
              <div className="ap-fields-grid cols-3">
                <div className="ap-field-group">
                  <label className="ap-field-label">Accounts Billing Invoice Number</label>
                  <input type="text" className="ap-field-input" value={subData.accounts_billing_invoice_no || ""}
                    onChange={e => hc("accounts_billing_invoice_no", e.target.value)} placeholder="Enter billing invoice number" />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">Accounts Billing Invoice Date</label>
                  <DatePickerInput value={subData.accounts_billing_invoice_date} onChange={v => hc("accounts_billing_invoice_date", v)} />
                </div>
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
            <div className="ap-section-subtitle" style={{ marginBottom: '12px' }}>Export Details</div>
            {(subData.export_details_array || []).map((row, idx) => (
              <div key={idx} className="ap-item-row-compact">
                <div className="ap-field-group" style={{ flex: '0 0 50px', minWidth: '40px' }}>
                  <label className="ap-field-label">Sr No.</label>
                  <input type="text" className="ap-field-input" value={idx + 1} readOnly style={{ textAlign: 'center', background: '#f1f5f9', fontWeight: 'bold' }} />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">Item Description (Export)</label>
                  <textarea className="ap-field-textarea" value={row.item_description}
                    onChange={e => handleExportDetailChange(idx, "item_description", e.target.value)}
                    placeholder="Export description..." />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">HS Code</label>
                  <HSCodeAutocomplete value={row.hs_code} onChange={v => handleExportDetailChange(idx, "hs_code", v)} />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">Qty (Export)</label>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input type="text" className="ap-field-input" value={row.qty}
                      onChange={e => handleExportDetailChange(idx, "qty", e.target.value)} placeholder="0.00" style={{ flex: 2 }} />
                    <div style={{ flex: 1.5 }}>
                      <UnitAutocomplete value={row.unit} onChange={v => handleExportDetailChange(idx, "unit", v)} />
                    </div>
                  </div>
                </div>
               
                <div className="ap-field-group">
                  <label className="ap-field-label">Value (FOB USD)</label>
                  <input type="text" className="ap-field-input" value={row.value_usd}
                    onChange={e => handleExportDetailChange(idx, "value_usd", e.target.value)} placeholder="0.00" />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">Value (FOB Rs)</label>
                  <input type="text" className="ap-field-input" value={row.value_rs}
                    onChange={e => handleExportDetailChange(idx, "value_rs", e.target.value)} placeholder="0.00" />
                </div>
                {idx > 0 ? (
                  <button type="button" className="ap-remove-row-btn" onClick={() => removeExportDetail(idx)} title="Remove Item">✕</button>
                ) : (
                  <div style={{ width: '28px' }}></div>
                )}
                 </div>
                  ))}
            <div style={{ marginTop: '8px', marginBottom: '24px' }}>
              <button type="button" className="ap-btn secondary" onClick={addExportDetail} style={{ padding: '4px 12px', height: '28px', fontSize: '12px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>+ Add Export Item</button>
            </div>

            <div className="ap-section-subtitle" style={{ marginBottom: '12px' }}>Import Details</div>
            {(subData.import_details_array || []).map((row, idx) => (
              <div key={idx} className="ap-item-row-compact has-status" style={{ paddingBottom: '8px', borderBottom: '1px solid #f1f5f9', marginBottom: '12px' }}>
                <div className="ap-field-group" style={{ flex: '0 0 50px', minWidth: '40px' }}>
                  <label className="ap-field-label">Sr No.</label>
                  <input type="text" className="ap-field-input" value={idx + 1} readOnly style={{ textAlign: 'center', background: '#f1f5f9', fontWeight: 'bold' }} />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">Status</label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '26px' }}>
                    <span className={`ap-item-status-badge ${getItemStatus(row).toLowerCase().replace(" ", "-")}`}>
                      {getItemStatus(row)}
                    </span>
                  </div>
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">Item Description (Import)</label>
                  <textarea className="ap-field-textarea" value={row.item_description}
                    onChange={e => handleImportDetailChange(idx, "item_description", e.target.value)}
                    placeholder="Import description..." />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">HS Code</label>
                  <HSCodeAutocomplete value={row.hs_code} onChange={v => handleImportDetailChange(idx, "hs_code", v)} />
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">Qty (Import)</label>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input type="text" className="ap-field-input" value={row.qty}
                      onChange={e => handleImportDetailChange(idx, "qty", e.target.value)} placeholder="0.00" style={{ flex: 2 }} />
                    <div style={{ flex: 1.5 }}>
                      <UnitAutocomplete value={row.unit} onChange={v => handleImportDetailChange(idx, "unit", v)} />
                    </div>
                  </div>
                  <div style={{ fontSize: "10px", marginTop: "3px", display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                    <span>Utilized: <strong>{row.total_utilized_qty !== undefined ? row.total_utilized_qty : 0}</strong></span>
                    <span>Balance: <strong style={{ color: "#16a34a", fontWeight: "700" }}>{row.balance_qty !== undefined ? row.balance_qty : (parseFloat(row.qty) || 0)}</strong></span>
                  </div>
                </div>
                
                <div className="ap-field-group">
                  <label className="ap-field-label">Value (CIF USD)</label>
                  <input type="text" className="ap-field-input" value={row.value_usd}
                    onChange={e => handleImportDetailChange(idx, "value_usd", e.target.value)} placeholder="0.00" />
                  <div style={{ fontSize: "10px", marginTop: "3px", display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                    <span>Utilized: <strong>${row.total_utilized_usd !== undefined ? row.total_utilized_usd : 0}</strong></span>
                    <span>Balance: <strong style={{ color: "#16a34a", fontWeight: "700" }}>${row.balance_cif_usd !== undefined ? row.balance_cif_usd : (parseFloat(row.value_usd) || 0)}</strong></span>
                  </div>
                </div>
                <div className="ap-field-group">
                  <label className="ap-field-label">Value (CIF Rs)</label>
                  <input type="text" className="ap-field-input" value={row.value_rs}
                    onChange={e => handleImportDetailChange(idx, "value_rs", e.target.value)} placeholder="0.00" />
                  <div style={{ fontSize: "10px", marginTop: "3px", display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                    <span>Utilized: <strong>₹{row.total_utilized_inr !== undefined ? row.total_utilized_inr : 0}</strong></span>
                    <span>Balance: <strong style={{ color: "#16a34a", fontWeight: "700" }}>₹{row.balance_cif_inr !== undefined ? row.balance_cif_inr : (parseFloat(row.value_rs) || 0)}</strong></span>
                  </div>
                </div>
                {idx > 0 ? (
                  <button type="button" className="ap-remove-row-btn" onClick={() => removeImportDetail(idx)} title="Remove Item">✕</button>
                ) : (
                  <div style={{ width: '28px' }}></div>
                )}
                
              
              </div>
            ))}
            <div style={{ marginTop: '8px' }}>
              <button type="button" className="ap-btn secondary" onClick={addImportDetail} style={{ padding: '4px 12px', height: '28px', fontSize: '12px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>+ Add Import Item</button>
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

            <div className="ap-fields-grid cols-3 mb-20" style={{ marginBottom: 20 }}>
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
                <label className="ap-field-label">Notification Number</label>
                <input type="text" className="ap-field-input" value={subData.notification_number}
                  onChange={e => hc("notification_number", e.target.value)} placeholder="Notification Number" />
              </div>
            </div>
            
            <div className="ap-table-responsive" style={{ overflowX: 'auto', minHeight: '250px' }}>
              <table className="ap-table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <th style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>Lic Item Sr</th>
                    <th style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>Job No.</th>
                    <th style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>Item Description</th>
                    <th style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>BE No.</th>
                    <th style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>BE Date</th>
                    <th style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>Qty</th>
                    <th style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>Unit</th>
                    <th style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>CIF INR</th>
                    <th style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>CIF USD</th>
                    <th style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold' }}>Port</th>
                  </tr>
                </thead>
                <tbody>
                  {(subData.utilization_records || []).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px', fontSize: '11.5px', color: '#000000' }}>{row.sr_no || "—"}</td>
                      <td style={{ padding: '8px', fontSize: '11.5px', color: '#000000', fontWeight: '600' }}>{row.job_no || "—"}</td>
                      <td style={{ padding: '8px', fontSize: '11.5px', color: '#000000' }}>{row.item_description || "—"}</td>
                      <td style={{ padding: '8px', fontSize: '11.5px', color: '#000000' }}>{row.be_no || "—"}</td>
                      <td style={{ padding: '8px', fontSize: '11.5px', color: '#000000' }}>{toDisplayDate(row.be_date) || "—"}</td>
                      <td style={{ padding: '8px', fontSize: '11.5px', color: '#000000', fontWeight: '600' }}>{row.qty || 0}</td>
                      <td style={{ padding: '8px', fontSize: '11.5px', color: '#000000' }}>{row.unit || "—"}</td>
                      <td style={{ padding: '8px', fontSize: '11.5px', color: '#000000' }}>₹{(row.cif_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '8px', fontSize: '11.5px', color: '#000000' }}>${(row.cif_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '8px', fontSize: '11.5px', color: '#000000' }}>{row.port || "—"}</td>
                    </tr>
                  ))}
                  {!(subData.utilization_records?.length) && (
                    <tr>
                      <td colSpan="10" style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                        No records added
                      </td>
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
