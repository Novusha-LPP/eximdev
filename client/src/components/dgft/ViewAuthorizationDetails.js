import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { format, addMonths, parse, parseISO, isValid } from "date-fns";
import { printAuthorizationPDF } from "../../utils/printAuthorizationPDF";
import "./ViewAuthorization.scss";

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
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

// ── DatePickerInput ───────────────────────────────────────────────
function DatePickerInput({ value, onChange, placeholder = "dd/mm/yyyy", disabled = false }) {
  const hiddenRef = useRef(null);

  const toNativeValue = (ddmmyyyy) => {
    if (!ddmmyyyy) return "";
    const parts = ddmmyyyy.split("/");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      if (dd && mm && yyyy && yyyy.length === 4) return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
    }
    return "";
  };

  const fromNativeValue = (yyyymmdd) => {
    if (!yyyymmdd) return "";
    const [yyyy, mm, dd] = yyyymmdd.split("-");
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleNativeChange = (e) => onChange(fromNativeValue(e.target.value));

  const handleTextChange = (e) => {
    let raw = e.target.value.replace(/[^0-9/]/g, "");
    const digits = raw.replace(/\//g, "");
    let formatted = "";
    if (digits.length <= 2) formatted = digits;
    else if (digits.length <= 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    else formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    onChange(formatted);
  };

  const openPicker = () => {
    if (disabled) return;
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
        disabled={disabled}
      />
      <button type="button" className="ap-date-icon-btn" onClick={openPicker} title="Pick a date" disabled={disabled}>
        <IconCalendar />
      </button>
      <input
        ref={hiddenRef}
        type="date"
        className="ap-date-hidden"
        onChange={handleNativeChange}
        tabIndex={-1}
        disabled={disabled}
      />
    </div>
  );
}

// ── Unit Autocomplete ──────────────────────────────────────────
export const unitCodes = [
  "BAG","BGS","BLS","BRL","BTL","BOX","BLK","CAN","CAR","CRY","CTN","CMS","CHI","COL","CON","CRI","CCM","CFT","CBI","CBM","CYL","DOZ","DRM","FLK","FOT","FUT","GMS","GRS","FBK","INC","NGT","JTA","JAL","KEG","KLT","KGS","KME","KIT","LTR","LOG","TON","MTR","MTS","MGS","MOU","NOS","NHM","THD","PKG","PAC","PAI","PRS","PLT","PCS","PNT","PND","QDS","QTL","REL","ROL","SET","SKD","SLB","SQF","SQM","SQY","BLO","BUL","ENV","TBL","TNK","TGM","TIN","TRK","UNT","UGS","CSK","YDS",
];

function UnitAutocomplete({ value, onChange, className = "ap-field-input", disabled = false }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => { setQuery(value || ""); }, [value]);

  const updateCoords = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const handleScroll = (e) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) {
        return;
      }
      setShowResults(false);
    };
    window.addEventListener("scroll", handleScroll, true);

    const handleResize = () => {
      setShowResults(false);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleInputChange = (e) => {
    if (disabled) return;
    const val = e.target.value.toUpperCase();
    setQuery(val);
    onChange(val);
    const filtered = val.trim()
      ? unitCodes.filter(c => c.includes(val)).slice(0, 10)
      : unitCodes.slice(0, 10);
    setResults(filtered);
    updateCoords();
    setShowResults(true);
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
        className={className}
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          if (disabled) return;
          const val = query.trim().toUpperCase();
          const filtered = val ? unitCodes.filter(c => c.includes(val)).slice(0, 10) : unitCodes.slice(0, 10);
          setResults(filtered);
          updateCoords();
          setShowResults(true);
        }}
        placeholder="Unit"
        disabled={disabled}
      />
      {showResults && results.length > 0 && createPortal(
        <ul 
          ref={dropdownRef}
          className="ap-autocomplete-results"
          style={{
            position: "absolute",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999,
          }}
        >
          {results.map((code, idx) => (
            <li key={idx} onClick={() => handleSelect(code)}>
              <div className="ap-res-code">{code}</div>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

// ── HS Code Autocomplete ──────────────────────────────────────────
function HSCodeAutocomplete({ value, onChange, className = "ap-field-input", disabled = false }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => { setQuery(value || ""); }, [value]);

  const updateCoords = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const handleScroll = (e) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) {
        return;
      }
      setShowResults(false);
    };
    window.addEventListener("scroll", handleScroll, true);

    const handleResize = () => {
      setShowResults(false);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const searchHS = async (q) => {
    if (!q || q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/search?query=${q}&addToRecent=false`);
      if (res.data?.results) { 
        setResults(res.data.results.slice(0, 10)); 
        updateCoords();
        setShowResults(true); 
      }
    } catch (err) {
      if (err?.response?.status !== 404) console.error(err);
      setResults([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    if (disabled) return;
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
          className={className}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (disabled) return;
            if (query.length >= 3) {
              updateCoords();
              setShowResults(true);
            }
          }}
          placeholder="Search HS Code..."
          disabled={disabled}
        />
        {loading && <div className="ap-field-loader"></div>}
      </div>
      {showResults && results.length > 0 && createPortal(
        <ul 
          ref={dropdownRef}
          className="ap-autocomplete-results"
          style={{
            position: "absolute",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999,
          }}
        >
          {results.map((item, idx) => (
            <li key={idx} onClick={() => handleSelect(item)}>
              <div className="ap-res-code">{item.hs_code}</div>
              <div className="ap-res-desc">{item.item_description}</div>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

const safeStr = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (val instanceof Date) return format(val, "dd/MM/yyyy");
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
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
    accounts_billing_invoice_no:   safeStr(found.accounts_billing_invoice_no),
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

  if (found.licence_date) {
    try {
      const authDate = parseFlexibleDate(found.licence_date);
      if (isValid(authDate)) {
        if (!sub.import_validity) sub.import_validity = format(addMonths(authDate, 12), "dd/MM/yyyy");
        if (!sub.export_validity) sub.export_validity = format(addMonths(authDate, 18), "dd/MM/yyyy");
      }
    } catch (e) {}
  }
  return sub;
};

// ── Main Component ────────────────────────────────────────────────
function ViewAuthorizationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isReadOnly = queryParams.get("readOnly") === "true";
  const [row, setRow] = useState(null);
  const [subData, setSubData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [kpiTab, setKpiTab] = useState("import");

  const fetchDetails = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-authorization-registrations`);
      const found = res.data.find(r => r._id === id);
      if (found) {
        setRow(found);
        const authNo = found.registration_no || found.licence_no || found.job_no;
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
  useEffect(() => { rowRef.current = row; }, [row]);

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
            const authNo = currentAuth?.registration_no || currentAuth?.licence_no || currentAuth?.job_no;
            const isMatch = authNo && (
              String(payload.authorizationNo).trim().toLowerCase() === String(currentAuth?.registration_no || "").trim().toLowerCase() ||
              String(payload.authorizationNo).trim().toLowerCase() === String(currentAuth?.licence_no || "").trim().toLowerCase() ||
              String(payload.authorizationNo).trim().toLowerCase() === String(currentAuth?.job_no || "").trim().toLowerCase() ||
              String(payload.authorizationNo).trim().toLowerCase() === `lic/${String(currentAuth?.job_no || "").trim().toLowerCase()}`
            );
            if (isMatch) fetchDetails();
          }
        } catch (e) {}
      };
      ws.onclose = () => { reconnectTimeout = setTimeout(connectWebSocket, 5000); };
      ws.onerror = () => { ws.close(); };
    };
    connectWebSocket();
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchDetails]);

  const getItemStatus = (item) => {
    if (item.status) return item.status;
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
        import_details_array: (subData.import_details_array || []).map((item, index) => ({ ...item, sr_no: index + 1 })),
        export_details_array: (subData.export_details_array || []).map((item, index) => ({ ...item, sr_no: index + 1 })),
      };
      const res = await axios.put(`${process.env.REACT_APP_API_STRING}/update-authorization-registration/${id}`, payload);
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      showToast("Changes saved successfully", "success");
      if (res.data?.data) {
        setRow(res.data.data);
        const authNo = res.data.data.registration_no || res.data.data.licence_no || res.data.data.job_no;
        let records = [];
        if (authNo) {
          try {
            const recordsRes = await axios.get(
              `${process.env.REACT_APP_API_STRING}/license-utilization/records`,
              { params: { authorization_no: authNo } }
            );
            records = recordsRes.data || [];
          } catch (err) {}
        }
        const sub = mapRecordToSubData({ ...res.data.data, utilization_records: records });
        setSubData(sub);
      } else {
        setSubData(payload);
      }
    } catch (err) {
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

  const handleImportDetailChange = (index, field, value) => {
    const newDetails = [...(subData.import_details_array || [])];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setSubData(prev => ({ ...prev, import_details_array: newDetails }));
  };

  const addImportDetail = () => {
    setSubData(prev => ({ ...prev, import_details_array: [...(prev.import_details_array || []), { item_description: '', hs_code: '', qty: '', unit: '', balance_qty: '', balance_unit: '', value_usd: '', value_rs: '' }] }));
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
    setSubData(prev => ({ ...prev, export_details_array: [...(prev.export_details_array || []), { item_description: '', hs_code: '', qty: '', unit: '', balance_qty: '', balance_unit: '', value_usd: '', value_rs: '' }] }));
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
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

        {/* ── General Info ── */}
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
              <div className="ap-firm-value date">{toDisplayDate(row.licence_date || row.auth_date || row.authorization_date) || "—"}</div>
            </div>
          </div>
        </div>

        {/* ── Validity ── */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Validity &amp; HS Codes</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid cols-4">
              <div className="ap-field-group">
                <label className="ap-field-label">Import Validity</label>
                <DatePickerInput value={subData.import_validity} onChange={v => hc("import_validity", v)} disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Export Validity</label>
                <DatePickerInput value={subData.export_validity} onChange={v => hc("export_validity", v)} disabled={isReadOnly} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Compliance & Documents ── */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Compliance &amp; Document Tracking</div>
          </div>
          <div className="ap-card-body">

            {/* BG + Bond inline */}
            <div className="ap-fields-grid cols-6" style={{ marginBottom: 0 }}>
              <div className="ap-field-group">
                <label className="ap-field-label">BG Number</label>
                <input type="text" className="ap-field-input" value={subData.bg_number || ""}
                  onChange={e => hc("bg_number", e.target.value)} placeholder="BG No." disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">BG Expiry</label>
                <DatePickerInput value={subData.bg_expiry_date} onChange={v => hc("bg_expiry_date", v)} disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">BG Amount</label>
                <input type="text" className="ap-field-input" value={subData.bg_amount || ""}
                  onChange={e => hc("bg_amount", e.target.value)} placeholder="Amount" disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Bond Number</label>
                <input type="text" className="ap-field-input" value={subData.bond_number || ""}
                  onChange={e => hc("bond_number", e.target.value)} placeholder="Bond No." disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Bond Expiry</label>
                <DatePickerInput value={subData.bond_expiry_date} onChange={v => hc("bond_expiry_date", v)} disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Bond Amount</label>
                <input type="text" className="ap-field-input" value={subData.bond_amount || ""}
                  onChange={e => hc("bond_amount", e.target.value)} placeholder="Amount" disabled={isReadOnly} />
              </div>
            </div>

            <div className="ap-section-divider" />

            {/* Doc Tracking + Billing */}
            <div className="ap-fields-grid cols-6">
              <div className="ap-field-group">
                <label className="ap-field-label">Docs Received</label>
                <DatePickerInput value={subData.documents_received_date} onChange={v => hc("documents_received_date", v)} disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Sent to ICD</label>
                <DatePickerInput value={subData.documents_send_to_icd} onChange={v => hc("documents_send_to_icd", v)} disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Sent to Accounts</label>
                <DatePickerInput value={subData.documents_send_to_accounts} onChange={v => hc("documents_send_to_accounts", v)} disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Scheme Code</label>
                <select className="ap-field-input" value={subData.scheme_code || ""} onChange={e => hc("scheme_code", e.target.value)} disabled={isReadOnly}>
                  <option value="">Select</option>
                  {["Full Duty","DEEC","EPCG","RODTEP","ROSCTL","TQ","SIL","SEZ","EOU","DFIA","Jobbing"].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Billing Invoice No.</label>
                <input type="text" className="ap-field-input" value={subData.accounts_billing_invoice_no || ""}
                  onChange={e => hc("accounts_billing_invoice_no", e.target.value)} placeholder="Invoice No." disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Billing Invoice Date</label>
                <DatePickerInput value={subData.accounts_billing_invoice_date} onChange={v => hc("accounts_billing_invoice_date", v)} disabled={isReadOnly} />
              </div>
            </div>

          </div>
        </div>

        {/* ── Quantity & Value ── */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Quantity &amp; Value Tracking
                  <button
                type="button"
                className="ap-btn secondary"
                style={{ padding: '3px 10px', height: '24px', fontSize: '11px', textTransform: 'none', letterSpacing: 'normal' }}
                onClick={() => {
                  setKpiTab("import");
                  setShowKpiModal(true);
                }}
              >
                View KPI Summary
              </button>
            </div>
          </div>
          <div className="ap-card-body">

            {/* Export Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
               
                <span>Export Details</span>
              </div>
              {!isReadOnly && (
                <button type="button" className="ap-btn-add-item-outline" onClick={addExportDetail}>
                  + Add Export Item
                </button>
              )}
            </div>

            <div className="ap-table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff', marginBottom: '20px' }}>
              <table className="ap-table" style={{ margin: 0, width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'center', width: '4%', minWidth: '40px', padding: '10px 8px', fontSize: '10.5px' }}>SR.</th>
                    <th style={{ textAlign: 'left', width: '35%', minWidth: '220px', padding: '10px 8px', fontSize: '10.5px' }}>ITEM DESCRIPTION</th>
                    <th style={{ textAlign: 'left', width: '12%', minWidth: '110px', padding: '10px 8px', fontSize: '10.5px' }}>HS CODE</th>
                    <th style={{ textAlign: 'left', width: '18%', minWidth: '150px', padding: '10px 8px', fontSize: '10.5px' }}>QTY / UNIT</th>
                    <th style={{ textAlign: 'left', width: '13%', minWidth: '110px', padding: '10px 8px', fontSize: '10.5px' }}>FOB USD</th>
                    <th style={{ textAlign: 'left', width: '13%', minWidth: '110px', padding: '10px 8px', fontSize: '10.5px' }}>FOB INR</th>
                    {!isReadOnly && <th style={{ textAlign: 'center', width: '5%', minWidth: '60px', padding: '10px 8px', fontSize: '10.5px' }}>ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {(subData.export_details_array || []).map((expRow, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ textAlign: 'center', padding: '8px', fontWeight: 600, color: '#64748b', verticalAlign: 'middle' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                        <textarea 
                          className="ap-field-textarea" 
                          value={expRow.item_description}
                          onChange={e => handleExportDetailChange(idx, "item_description", e.target.value)}
                          placeholder="Export description..." 
                          rows={1}
                          style={{ minHeight: '32px', margin: 0, padding: '6px 8px' }}
                          disabled={isReadOnly}
                        />
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                        <HSCodeAutocomplete 
                          value={expRow.hs_code} 
                          onChange={v => handleExportDetailChange(idx, "hs_code", v)} 
                          disabled={isReadOnly}
                        />
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            className="ap-field-input" 
                            value={expRow.qty}
                            onChange={e => handleExportDetailChange(idx, "qty", e.target.value)} 
                            placeholder="0.00" 
                            style={{ flex: 2, margin: 0 }} 
                            disabled={isReadOnly}
                          />
                          <div style={{ flex: 1.5 }}>
                            <UnitAutocomplete 
                              value={expRow.unit} 
                              onChange={v => handleExportDetailChange(idx, "unit", v)} 
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                        <input 
                          type="text" 
                          className="ap-field-input" 
                          value={expRow.value_usd}
                          onChange={e => handleExportDetailChange(idx, "value_usd", e.target.value)} 
                          placeholder="0.00" 
                          style={{ margin: 0 }}
                          disabled={isReadOnly}
                        />
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                        <input 
                          type="text" 
                          className="ap-field-input" 
                          value={expRow.value_rs}
                          onChange={e => handleExportDetailChange(idx, "value_rs", e.target.value)} 
                          placeholder="0.00" 
                          style={{ margin: 0 }}
                          disabled={isReadOnly}
                        />
                      </td>
                      {!isReadOnly && (
                        <td style={{ textAlign: 'center', padding: '8px', verticalAlign: 'middle' }}>
                          {idx > 0 ? (
                            <button 
                              type="button" 
                              className="ap-remove-row-btn-new" 
                              onClick={() => removeExportDetail(idx)} 
                              title="Remove"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                background: '#fff',
                                border: '1px solid #fee2e2',
                                borderRadius: '6px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; }}
                              onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                            >
                              <IconTrash />
                            </button>
                          ) : (
                            <div style={{ width: '28px', height: '28px' }} />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {(!subData.export_details_array || subData.export_details_array.length === 0) && (
                    <tr>
                      <td colSpan={isReadOnly ? "6" : "7"} className="ap-table-empty">No export details found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Import Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
             
                <span>Import Details</span>
              </div>
              {!isReadOnly && (
                <button type="button" className="ap-btn-add-item-outline" onClick={addImportDetail}>
                  + Add Import Item
                </button>
              )}
            </div>

            <div className="ap-table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff', marginBottom: '12px' }}>
              <table className="ap-table" style={{ margin: 0, width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'center', width: '4%', minWidth: '40px', padding: '10px 8px', fontSize: '10.5px' }}>SR.</th>
                    <th style={{ textAlign: 'left', width: '10%', minWidth: '110px', padding: '10px 8px', fontSize: '10.5px' }}>STATUS</th>
                    <th style={{ textAlign: 'left', width: '32%', minWidth: '250px', padding: '10px 8px', fontSize: '10.5px' }}>ITEM DESCRIPTION</th>
                    <th style={{ textAlign: 'left', width: '10%', minWidth: '100px', padding: '10px 8px', fontSize: '10.5px' }}>HS CODE</th>
                    <th style={{ textAlign: 'left', width: '17%', minWidth: '150px', padding: '10px 8px', fontSize: '10.5px' }}>QTY / UNIT</th>
                    <th style={{ textAlign: 'left', width: '11%', minWidth: '110px', padding: '10px 8px', fontSize: '10.5px' }}>CIF USD</th>
                    <th style={{ textAlign: 'left', width: '11%', minWidth: '110px', padding: '10px 8px', fontSize: '10.5px' }}>CIF INR</th>
                    {!isReadOnly && <th style={{ textAlign: 'center', width: '5%', minWidth: '60px', padding: '10px 8px', fontSize: '10.5px' }}>ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {(subData.import_details_array || []).map((impRow, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ textAlign: 'center', padding: '8px', fontWeight: 600, color: '#64748b', verticalAlign: 'top' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>
                        <span className={`ap-item-status-badge ${getItemStatus(impRow).toLowerCase().replace(" ", "-")}`}>
                          {getItemStatus(impRow)}
                        </span>
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>
                        <textarea 
                          className="ap-field-textarea-borderless" 
                          value={impRow.item_description}
                          onChange={e => handleImportDetailChange(idx, "item_description", e.target.value)}
                          placeholder="Import description..." 
                          rows={2}
                          style={{ margin: 0, padding: 0 }}
                          disabled={isReadOnly}
                        />
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>
                        <HSCodeAutocomplete 
                          value={impRow.hs_code} 
                          onChange={v => handleImportDetailChange(idx, "hs_code", v)} 
                          className="ap-field-input-borderless"
                          disabled={isReadOnly}
                        />
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            className="ap-field-input-borderless" 
                            value={impRow.qty}
                            onChange={e => handleImportDetailChange(idx, "qty", e.target.value)} 
                            placeholder="0.00" 
                            style={{ flex: 2, margin: 0, fontWeight: 'normal' }} 
                            disabled={isReadOnly}
                          />
                          <div style={{ flex: 1.5 }}>
                            <UnitAutocomplete 
                              value={impRow.unit} 
                              onChange={v => handleImportDetailChange(idx, "unit", v)} 
                              className="ap-field-input-borderless"
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                        <div className="ap-sub-meta" style={{ marginTop: '4px', gap: '6px' }}>
                          <span>Used: <strong>{impRow.total_utilized_qty ?? 0}</strong></span>
                          <span>|</span>
                          <span>Bal: <strong className="green">{impRow.balance_qty ?? (parseFloat(impRow.qty) || 0)}</strong></span>
                        </div>
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>
                        <input 
                          type="text" 
                          className="ap-field-input-borderless" 
                          value={impRow.value_usd}
                          onChange={e => handleImportDetailChange(idx, "value_usd", e.target.value)} 
                          placeholder="0.00" 
                          style={{ margin: 0 }}
                          disabled={isReadOnly}
                        />
                        <div className="ap-sub-meta" style={{ marginTop: '4px', gap: '6px' }}>
                          <span>Used: <strong>${impRow.total_utilized_usd ?? 0}</strong></span>
                          <span>|</span>
                          <span>Bal: <strong className="green">${impRow.balance_cif_usd ?? (parseFloat(impRow.value_usd) || 0)}</strong></span>
                        </div>
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>
                        <input 
                          type="text" 
                          className="ap-field-input-borderless" 
                          value={impRow.value_rs}
                          onChange={e => handleImportDetailChange(idx, "value_rs", e.target.value)} 
                          placeholder="0.00" 
                          style={{ margin: 0 }}
                          disabled={isReadOnly}
                        />
                        <div className="ap-sub-meta" style={{ marginTop: '4px', gap: '6px' }}>
                          <span>Used: <strong>₹{impRow.total_utilized_inr ?? 0}</strong></span>
                          <span>|</span>
                          <span>Bal: <strong className="green">₹{impRow.balance_cif_inr ?? (parseFloat(impRow.value_rs) || 0)}</strong></span>
                        </div>
                      </td>
                      {!isReadOnly && (
                        <td style={{ textAlign: 'center', padding: '8px', verticalAlign: 'top' }}>
                          {idx > 0 ? (
                            <button 
                              type="button" 
                              className="ap-remove-row-btn-new" 
                              onClick={() => removeImportDetail(idx)} 
                              title="Remove"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                background: '#fff',
                                border: '1px solid #fee2e2',
                                borderRadius: '6px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; }}
                              onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                            >
                              <IconTrash />
                            </button>
                          ) : (
                            <div style={{ width: '28px', height: '28px' }} />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {(!subData.import_details_array || subData.import_details_array.length === 0) && (
                    <tr>
                      <td colSpan={isReadOnly ? "7" : "8"} className="ap-table-empty">No import details found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Utilisation Details ── */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Utilisation Details</div>
          </div>
          <div className="ap-card-body">

            <div className="ap-fields-grid cols-6" style={{ marginBottom: 12 }}>
             
              <div className="ap-field-group">
                <label className="ap-field-label">Registration No.</label>
                <input type="text" className="ap-field-input" value={subData.registration_no}
                  onChange={e => hc("registration_no", e.target.value)} placeholder="Auth No." disabled={isReadOnly} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Auth Date</label>
                <DatePickerInput value={subData.auth_date} onChange={v => hc("auth_date", v)} disabled={isReadOnly} />
              </div>
              <div className="ap-field-group" style={{ gridColumn: "span 4" }}>
                <label className="ap-field-label">Notification No.</label>
                <input type="text" className="ap-field-input" value={subData.notification_number}
                  onChange={e => hc("notification_number", e.target.value)} placeholder="Notification No." disabled={isReadOnly} />
              </div>
            </div>

            <div className="ap-table-responsive">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Lic Item Sr</th>
                    <th>Job No.</th>
                    <th>Item Description</th>
                    <th>BE No.</th>
                    <th>BE Date</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>CIF INR</th>
                    <th>CIF USD</th>
                    <th>Port</th>
                  </tr>
                </thead>
                <tbody>
                  {(subData.utilization_records || []).map((rec, idx) => (
                    <tr key={idx}>
                      <td>{rec.license_sr || rec.sr_no || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{rec.job_no || "—"}</td>
                      <td>{rec.item_description || "—"}</td>
                      <td>{rec.be_no || "—"}</td>
                      <td>{toDisplayDate(rec.be_date) || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{rec.qty || 0}</td>
                      <td>{rec.unit || "—"}</td>
                      <td>₹{(rec.cif_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>${(rec.cif_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{rec.port || "—"}</td>
                    </tr>
                  ))}
                  {!subData.utilization_records?.length && (
                    <tr>
                      <td colSpan="10" className="ap-table-empty">No records added</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* ── FLOATING SAVE ── */}
      {!isReadOnly && (
        <div className="ap-floating-save">
          <span className="ap-floating-save-meta">{lastSaved ? `Last saved at ${lastSaved}` : "Unsaved changes"}</span>
          <button className="ap-btn primary ap-floating-btn" onClick={handleSave} disabled={saving}>
            <IconCheck />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* ── FOOTER ── */}
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

      {/* ── KPI SUMMARY MODAL ── */}
      {showKpiModal && (
        <div className="ap-modal-overlay" onClick={() => setShowKpiModal(false)}>
          <div className="ap-modal-content" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">DGFT License KPI Summary</h3>
              <button className="ap-modal-close-btn" onClick={() => setShowKpiModal(false)}>✕</button>
            </div>
            
            <div className="ap-modal-tabs">
              <button 
                type="button" 
                className={`ap-modal-tab-btn ${kpiTab === 'import' ? 'active' : ''}`}
                onClick={() => setKpiTab('import')}
              >
                Import Item KPIs
              </button>
              <button 
                type="button" 
                className={`ap-modal-tab-btn ${kpiTab === 'export' ? 'active' : ''}`}
                onClick={() => setKpiTab('export')}
              >
                Export Item KPIs
              </button>
            </div>

            <div className="ap-modal-body">
              {kpiTab === 'import' ? (
                <>
                  {!(subData.import_details_array?.length) && (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No import items registered.</div>
                  )}
                  {(subData.import_details_array || []).map((item, idx) => {
                    const qtyVal        = parseFloat(item.qty) || 0;
                    const utilizedQty   = parseFloat(item.total_utilized_qty) || 0;
                    const balanceQty    = Math.max(0, qtyVal - utilizedQty);

                    const licensedUSD   = parseFloat(item.value_usd) || 0;
                    const utilizedUSD   = parseFloat(item.total_utilized_usd) || 0;
                    const balanceUSD    = Math.max(0, licensedUSD - utilizedUSD);

                    const licensedINR   = parseFloat(item.value_rs) || 0;
                    const utilizedINR   = parseFloat(item.total_utilized_inr) || 0;
                    const balanceINR    = Math.max(0, licensedINR - utilizedINR);

                    const utilizePct    = qtyVal > 0 ? Math.min(100, Math.round((utilizedQty / qtyVal) * 100)) : 0;
                    const availPct      = Math.max(0, 100 - utilizePct);

                    const fmtQty  = (v) => v.toLocaleString('en-IN', { maximumFractionDigits: 3 });
                    const fmtUSD  = (v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                    const fmtINR  = (v) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

                    return (
                      <div className="ap-item-kpi-block" key={idx}>
                        <div className="ap-item-kpi-header">
                          <span className="ap-item-kpi-badge">Import Item {idx + 1}</span>
                          <span className="ap-item-kpi-name" title={item.item_description}>
                            {item.item_description || "—"}
                          </span>
                          {item.hs_code && (
                            <span className="ap-item-kpi-hs">HS: <span className="mono">{item.hs_code}</span></span>
                          )}
                        </div>

                        <div className="ap-kpi-grid">
                          <div className="ap-kpi-card licensed">
                            <div className="ap-kpi-header">
                              <span className="ap-kpi-title">Licensed</span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">Qty</span>
                              <span className="ap-kpi-val">{fmtQty(qtyVal)} <span className="ap-kpi-unit">{item.unit || "—"}</span></span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">CIF</span>
                              <span className="ap-kpi-val ap-kpi-val-inline">
                                <span>{fmtUSD(licensedUSD)}</span>
                                <span className="ap-kpi-val-separator">|</span>
                                <span className="ap-kpi-val-secondary">{fmtINR(licensedINR)}</span>
                              </span>
                            </div>
                          </div>

                          <div className="ap-kpi-card utilized">
                            <div className="ap-kpi-header">
                              <span className="ap-kpi-title">Utilized</span>
                              <span className="ap-kpi-pct-badge utilized-pct">{utilizePct}%</span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">Qty</span>
                              <span className="ap-kpi-val">{fmtQty(utilizedQty)}</span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">CIF</span>
                              <span className="ap-kpi-val ap-kpi-val-inline">
                                <span>{fmtUSD(utilizedUSD)}</span>
                                <span className="ap-kpi-val-separator">|</span>
                                <span className="ap-kpi-val-secondary">{fmtINR(utilizedINR)}</span>
                              </span>
                            </div>
                          </div>

                          <div className="ap-kpi-card balance">
                            <div className="ap-kpi-header">
                              <span className="ap-kpi-title">Balance</span>
                              <span className="ap-kpi-pct-badge balance-pct">{availPct}%</span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">Qty</span>
                              <span className="ap-kpi-val">{fmtQty(balanceQty)}</span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">CIF</span>
                              <span className="ap-kpi-val ap-kpi-val-inline">
                                <span>{fmtUSD(balanceUSD)}</span>
                                <span className="ap-kpi-val-separator">|</span>
                                <span className="ap-kpi-val-secondary">{fmtINR(balanceINR)}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="ap-progress-bar-wrap">
                          <div className="ap-progress-info">
                            <span>{utilizePct}% Utilized</span>
                            <span>{availPct}% Available</span>
                          </div>
                          <div className="ap-progress-bar-container">
                            <div className="ap-progress-bar-fill" style={{ width: `${utilizePct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  {!(subData.export_details_array?.length) && (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No export items registered.</div>
                  )}
                  {(subData.export_details_array || []).map((item, idx) => {
                    const qtyVal        = parseFloat(item.qty) || 0;
                    const utilizedQty   = parseFloat(item.total_utilized_qty) || 0;
                    const balanceQty    = Math.max(0, qtyVal - utilizedQty);

                    const licensedUSD   = parseFloat(item.value_usd) || 0;
                    const utilizedUSD   = parseFloat(item.total_utilized_usd) || 0;
                    const balanceUSD    = Math.max(0, licensedUSD - utilizedUSD);

                    const licensedINR   = parseFloat(item.value_rs) || 0;
                    const utilizedINR   = parseFloat(item.total_utilized_inr) || 0;
                    const balanceINR    = Math.max(0, licensedINR - utilizedINR);

                    const utilizePct    = qtyVal > 0 ? Math.min(100, Math.round((utilizedQty / qtyVal) * 100)) : 0;
                    const availPct      = Math.max(0, 100 - utilizePct);

                    const fmtQty  = (v) => v.toLocaleString('en-IN', { maximumFractionDigits: 3 });
                    const fmtUSD  = (v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                    const fmtINR  = (v) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

                    return (
                      <div className="ap-item-kpi-block" key={idx}>
                        <div className="ap-item-kpi-header">
                          <span className="ap-item-kpi-badge" style={{ background: '#dcfce7', color: '#16a34a' }}>Export Item {idx + 1}</span>
                          <span className="ap-item-kpi-name" title={item.item_description}>
                            {item.item_description || "—"}
                          </span>
                          {item.hs_code && (
                            <span className="ap-item-kpi-hs">HS: <span className="mono">{item.hs_code}</span></span>
                          )}
                        </div>

                        <div className="ap-kpi-grid">
                          <div className="ap-kpi-card licensed">
                            <div className="ap-kpi-header">
                              <span className="ap-kpi-title">Licensed</span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">Qty</span>
                              <span className="ap-kpi-val">{fmtQty(qtyVal)} <span className="ap-kpi-unit">{item.unit || "—"}</span></span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">FOB</span>
                              <span className="ap-kpi-val ap-kpi-val-inline">
                                <span>{fmtUSD(licensedUSD)}</span>
                                <span className="ap-kpi-val-separator">|</span>
                                <span className="ap-kpi-val-secondary">{fmtINR(licensedINR)}</span>
                              </span>
                            </div>
                          </div>

                          <div className="ap-kpi-card utilized">
                            <div className="ap-kpi-header">
                              <span className="ap-kpi-title">Utilized</span>
                              <span className="ap-kpi-pct-badge utilized-pct">{utilizePct}%</span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">Qty</span>
                              <span className="ap-kpi-val">{fmtQty(utilizedQty)}</span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">FOB</span>
                              <span className="ap-kpi-val ap-kpi-val-inline">
                                <span>{fmtUSD(utilizedUSD)}</span>
                                <span className="ap-kpi-val-separator">|</span>
                                <span className="ap-kpi-val-secondary">{fmtINR(utilizedINR)}</span>
                              </span>
                            </div>
                          </div>

                          <div className="ap-kpi-card balance">
                            <div className="ap-kpi-header">
                              <span className="ap-kpi-title">Balance</span>
                              <span className="ap-kpi-pct-badge balance-pct">{availPct}%</span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">Qty</span>
                              <span className="ap-kpi-val">{fmtQty(balanceQty)}</span>
                            </div>
                            <div className="ap-kpi-row">
                              <span className="ap-kpi-lbl">FOB</span>
                              <span className="ap-kpi-val ap-kpi-val-inline">
                                <span>{fmtUSD(balanceUSD)}</span>
                                <span className="ap-kpi-val-separator">|</span>
                                <span className="ap-kpi-val-secondary">{fmtINR(balanceINR)}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="ap-progress-bar-wrap">
                          <div className="ap-progress-info">
                            <span>{utilizePct}% Utilized</span>
                            <span>{availPct}% Available</span>
                          </div>
                          <div className="ap-progress-bar-container">
                            <div className="ap-progress-bar-fill" style={{ width: `${utilizePct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
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