import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const unitCodes = [
  "BAG", "BGS", "BLS", "BRL", "BTL", "BOX", "BLK", "CAN", "CAR", "CRY", "CTN", "CMS", "CHI", "COL", "CON", "CRI", "CCM", "CFT", "CBI", "CBM", "CYL", "DOZ", "DRM", "FLK", "FOT", "FUT", "GMS", "GRS", "FBK", "INC", "NGT", "JTA", "JAL", "KEG", "KLT", "KGS", "KME", "KIT", "LTR", "LOG", "TON", "MTR", "MTS", "MGS", "MOU", "NOS", "NHM", "THD", "PKG", "PAC", "PAI", "PRS", "PLT", "PCS", "PNT", "PND", "QDS", "QTL", "REL", "ROL", "SET", "SKD", "SLB", "SQF", "SQM", "SQY", "BLO", "BUL", "ENV", "TBL", "TNK", "TGM", "TIN", "TRK", "UNT", "UGS", "CSK", "YDS",
];

function UnitAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

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
      setResults(unitCodes.filter((c) => c.includes(val)).slice(0, 10));
      setShowResults(true);
      return;
    }
    setResults(unitCodes.slice(0, 10));
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
        className="ap-field-input"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          const val = query.trim().toUpperCase();
          setResults(val ? unitCodes.filter((c) => c.includes(val)).slice(0, 10) : unitCodes.slice(0, 10));
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

function HSCodeAutocomplete({ value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchHS = async (q) => {
    if (!q || q.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/search?query=${q}&addToRecent=false`);
      if (res.data?.results) {
        setResults(res.data.results.slice(0, 10));
        setShowResults(true);
      }
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.error(err);
      }
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
    setQuery(item.hs_code || "");
    onChange(item.hs_code || "");
    if (onSelect) onSelect(item);
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

function ViewDgftRegisterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const fetchDetails = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-dgft-registers`);
      const found = res.data.find((r) => r._id === id);
      if (found) {
        setRow(found);
        setFormData({
          party_name: found.party_name || "",
          iec_no: found.iec_no || "",
          licence_no: found.licence_no || "",
          licence_date: found.licence_date || "",
          scheme: found.scheme || found.category || "",
          file_no: found.file_no || found.file_no_key_no || "",
          file_date: found.file_date || "",
          port_of_registration: found.port_of_registration || "",
          import_validity: found.import_validity || "",
          export_validity: found.export_validity || "",
          hs_code_export: found.hs_code_export || "",
          item_description_export: found.item_description_export || "",
          hs_code_import: found.hs_code_import || "",
          item_description_import: found.item_description_import || "",
          docs_received_date: found.docs_received_date || "",
          online_submission_date: found.online_submission_date || found.submitted_at_dgft_on || "",
          documents_send_to_accounts_date: found.documents_send_to_accounts_date || found.docs_handed_over_to_ac || "",
          payment_details: found.payment_details || "",
          transaction_id: found.transaction_id || "",
          transaction_amount: found.transaction_amount || "",
          transaction_date: found.transaction_date || "",
          qty_export: found.qty_export || "",
          unit_export: found.unit_export || "",
          export_value_fob_usd: found.export_value_fob_usd || "",
          export_value_rs: found.export_value_rs || "",
          qty_import: found.qty_import || "",
          unit_import: found.unit_import || "",
          import_value_fob_usd: found.import_value_fob_usd || "",
          import_value_rs: found.import_value_rs || "",
          job_status: found.job_status || "",
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

  const hc = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const showToast = (message, severity) => {
    setToast({ open: true, message, severity });
    setTimeout(() => setToast({ open: false, message: "", severity: "success" }), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_STRING}/update-dgft-register/${id}`, formData);
      showToast("DGFT register details saved", "success");
      setRow((prev) => ({ ...prev, ...formData }));
    } catch (err) {
      console.error(err);
      showToast("Failed to save details", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="ar-loading">Loading DGFT register details...</div>;
  if (!row) return <div className="ar-error">DGFT record not found.</div>;

  const jobNoClean = row.job_no
    ? (row.job_no.toString().includes("/") ? row.job_no : `DGFT/${row.job_no}`)
    : "DGFT/--";

  return (
    <div className="ap-details-container">
      <div className="ap-subheader">
        <div className="ap-subheader-left">
          <button className="ap-back-btn" onClick={() => navigate(-1)} title="Back">←</button>
          <h1 className="ap-page-title">
            DGFT Register Details - <span>{jobNoClean}</span>
          </h1>
        </div>
      </div>

      <div className="ap-content">
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">General Information</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid cols-4">
              <div className="ap-field-group">
                <label className="ap-field-label">Firm Name</label>
                <input className="ap-field-input" value={formData.party_name || ""} onChange={(e) => hc("party_name", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">IEC No.</label>
                <input className="ap-field-input" value={formData.iec_no || ""} onChange={(e) => hc("iec_no", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Auth No.</label>
                <input className="ap-field-input" value={formData.licence_no || ""} onChange={(e) => hc("licence_no", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Auth Date</label>
                <input type="date" className="ap-field-input" value={formData.licence_date || ""} onChange={(e) => hc("licence_date", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Scheme</label>
                <input className="ap-field-input" value={formData.scheme || ""} onChange={(e) => hc("scheme", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">File No.</label>
                <input className="ap-field-input" value={formData.file_no || ""} onChange={(e) => hc("file_no", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">File Date</label>
                <input type="date" className="ap-field-input" value={formData.file_date || ""} onChange={(e) => hc("file_date", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Port of Registration</label>
                <input className="ap-field-input" value={formData.port_of_registration || ""} onChange={(e) => hc("port_of_registration", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Validity, Item and HS Code</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid cols-2">
              <div className="ap-field-group">
                <label className="ap-field-label">Import Validity</label>
                <input type="date" className="ap-field-input" value={formData.import_validity || ""} onChange={(e) => hc("import_validity", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Export Validity</label>
                <input type="date" className="ap-field-input" value={formData.export_validity || ""} onChange={(e) => hc("export_validity", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">HS Code (Export)</label>
                <HSCodeAutocomplete
                  value={formData.hs_code_export || ""}
                  onChange={(v) => hc("hs_code_export", v)}
                  onSelect={(item) => {
                    if (!formData.item_description_export && item?.item_description) {
                      hc("item_description_export", item.item_description);
                    }
                  }}
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Item Description (Export)</label>
                <textarea className="ap-field-textarea" rows={3} value={formData.item_description_export || ""} onChange={(e) => hc("item_description_export", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">HS Code (Import)</label>
                <HSCodeAutocomplete
                  value={formData.hs_code_import || ""}
                  onChange={(v) => hc("hs_code_import", v)}
                  onSelect={(item) => {
                    if (!formData.item_description_import && item?.item_description) {
                      hc("item_description_import", item.item_description);
                    }
                  }}
                />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Item Description (Import)</label>
                <textarea className="ap-field-textarea" rows={3} value={formData.item_description_import || ""} onChange={(e) => hc("item_description_import", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Compliance &amp; Document Tracking</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid cols-3">
              <div className="ap-field-group">
                <label className="ap-field-label">Documents Received Date</label>
                <input type="date" className="ap-field-input" value={formData.docs_received_date || ""} onChange={(e) => hc("docs_received_date", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Online Submission Date</label>
                <input type="date" className="ap-field-input" value={formData.online_submission_date || ""} onChange={(e) => hc("online_submission_date", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Documents Send To Accounts Date</label>
                <input type="date" className="ap-field-input" value={formData.documents_send_to_accounts_date || ""} onChange={(e) => hc("documents_send_to_accounts_date", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Payment Details</label>
                <input className="ap-field-input" value={formData.payment_details || ""} onChange={(e) => hc("payment_details", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Transaction ID</label>
                <input className="ap-field-input" value={formData.transaction_id || ""} onChange={(e) => hc("transaction_id", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Transaction Amount</label>
                <input className="ap-field-input" value={formData.transaction_amount || ""} onChange={(e) => hc("transaction_amount", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Transaction Date</label>
                <input type="date" className="ap-field-input" value={formData.transaction_date || ""} onChange={(e) => hc("transaction_date", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Quantity &amp; Value Tracking</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-section-subtitle">Export Details</div>
            <div className="ap-fields-grid cols-3">
              <div className="ap-field-group">
                <label className="ap-field-label">Qty (Export)</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input className="ap-field-input" style={{ flex: 2 }} value={formData.qty_export || ""} onChange={(e) => hc("qty_export", e.target.value)} />
                  <div style={{ flex: 1 }}>
                    <UnitAutocomplete value={formData.unit_export || ""} onChange={(v) => hc("unit_export", v)} />
                  </div>
                </div>
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Export Value (FOB USD)</label>
                <input className="ap-field-input" value={formData.export_value_fob_usd || ""} onChange={(e) => hc("export_value_fob_usd", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Export Value (Rs)</label>
                <input className="ap-field-input" value={formData.export_value_rs || ""} onChange={(e) => hc("export_value_rs", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">HS Code (Export)</label>
                <HSCodeAutocomplete value={formData.hs_code_export || ""} onChange={(v) => hc("hs_code_export", v)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Item Description (Export)</label>
                <textarea className="ap-field-textarea" rows={3} value={formData.item_description_export || ""} onChange={(e) => hc("item_description_export", e.target.value)} />
              </div>
            </div>

            <div className="ap-section-subtitle mt-20">Import Details</div>
            <div className="ap-fields-grid cols-3">
              <div className="ap-field-group">
                <label className="ap-field-label">Qty (Import)</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input className="ap-field-input" style={{ flex: 2 }} value={formData.qty_import || ""} onChange={(e) => hc("qty_import", e.target.value)} />
                  <div style={{ flex: 1 }}>
                    <UnitAutocomplete value={formData.unit_import || ""} onChange={(v) => hc("unit_import", v)} />
                  </div>
                </div>
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Import Value (FOB USD)</label>
                <input className="ap-field-input" value={formData.import_value_fob_usd || ""} onChange={(e) => hc("import_value_fob_usd", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Import Value (Rs)</label>
                <input className="ap-field-input" value={formData.import_value_rs || ""} onChange={(e) => hc("import_value_rs", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">HS Code (Import)</label>
                <HSCodeAutocomplete value={formData.hs_code_import || ""} onChange={(v) => hc("hs_code_import", v)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Item Description (Import)</label>
                <textarea className="ap-field-textarea" rows={3} value={formData.item_description_import || ""} onChange={(e) => hc("item_description_import", e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ap-floating-save">
        <span className="ap-floating-save-meta">{saving ? "Saving..." : "Ready to save"}</span>
        <button className="ap-btn primary ap-floating-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {toast.open && (
        <div className={`dgft-toast ${toast.severity}`}>
          {toast.message}
          <button onClick={() => setToast((t) => ({ ...t, open: false }))}>✕</button>
        </div>
      )}
    </div>
  );
}

export default ViewDgftRegisterDetails;
