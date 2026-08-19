import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const unitCodes = [
  "BAG", "BGS", "BLS", "BRL", "BTL", "BOX", "BLK", "CAN", "CAR", "CRY", "CTN", "CMS", "CHI", "COL", "CON", "CRI", "CCM", "CFT", "CBI", "CBM", "CYL", "DOZ", "DRM", "FLK", "FOT", "FUT", "GMS", "GRS", "FBK", "INC", "NGT", "JTA", "JAL", "KEG", "KLT", "KGS", "KME", "KIT", "LTR", "LOG", "TON", "MTR", "MTS", "MGS", "MOU", "NOS", "NHM", "THD", "PKG", "PAC", "PAI", "PRS", "PLT", "PCS", "PNT", "PND", "QDS", "QTL", "REL", "ROL", "SET", "SKD", "SLB", "SQF", "SQM", "SQY", "BLO", "BUL", "ENV", "TBL", "TNK", "TGM", "TIN", "TRK", "UNT", "UGS", "CSK", "YDS",
];

function UnitAutocomplete({ value, onChange, disabled, onDisabledClick }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

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
      ? unitCodes.filter((c) => c.includes(val)).slice(0, 10)
      : unitCodes.slice(0, 10);
    setResults(filtered);
    updateCoords();
    setShowResults(true);
  };

  const handleSelect = (code) => {
    if (disabled) return;
    setQuery(code);
    onChange(code);
    setShowResults(false);
  };

  return (
    <div
      className="ap-autocomplete-wrapper"
      ref={wrapperRef}
      onClick={disabled && onDisabledClick ? onDisabledClick : undefined}
    >
      <input
        type="text"
        className="ap-field-input"
        value={query}
        disabled={disabled}
        onChange={handleInputChange}
        onFocus={() => {
          if (disabled) {
            if (onDisabledClick) onDisabledClick();
            return;
          }
          const val = query.trim().toUpperCase();
          setResults(val ? unitCodes.filter((c) => c.includes(val)).slice(0, 10) : unitCodes.slice(0, 10));
          updateCoords();
          setShowResults(true);
        }}
        placeholder="Unit"
        style={disabled ? { background: "#f8fafc", color: "#94a3b8", cursor: "pointer" } : {}}
      />
      {showResults && results.length > 0 && !disabled && createPortal(
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

function HSCodeAutocomplete({ value, onChange, onSelect, disabled, onDisabledClick }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

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
    if (!q || q.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/search?query=${q}&addToRecent=false`);
      if (res.data?.results) {
        setResults(res.data.results.slice(0, 10));
        updateCoords();
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
    if (disabled) return;
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    searchHS(val);
  };

  const handleSelect = (item) => {
    if (disabled) return;
    setQuery(item.hs_code || "");
    onChange(item.hs_code || "");
    if (onSelect) onSelect(item);
    setShowResults(false);
  };

  return (
    <div
      className="ap-autocomplete-wrapper"
      ref={wrapperRef}
      onClick={disabled && onDisabledClick ? onDisabledClick : undefined}
    >
      <div className="ap-field-input-wrap">
        <input
          type="text"
          className="ap-field-input"
          value={query}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => {
            if (disabled) {
              if (onDisabledClick) onDisabledClick();
              return;
            }
            if (query.length >= 3) {
              updateCoords();
              setShowResults(true);
            }
          }}
          placeholder="Search HS Code..."
          style={disabled ? { background: "#f8fafc", color: "#94a3b8", cursor: "pointer" } : {}}
        />
        {loading && <div className="ap-field-loader"></div>}
      </div>
      {showResults && results.length > 0 && !disabled && createPortal(
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

function ViewDgftRegisterDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [row, setRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [confirmSubmitModalOpen, setConfirmSubmitModalOpen] = useState(false);
  const [removeDocModalOpen, setRemoveDocModalOpen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docFileInputRef = useRef(null);
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
          accounts_inv_no: found.accounts_inv_no || "",
          accounts_inv_date: found.accounts_inv_date || "",
          qty_export: found.qty_export || "",
          unit_export: found.unit_export || "",
          export_value_fob_usd: found.export_value_fob_usd || "",
          export_value_rs: found.export_value_rs || "",
          qty_import: found.qty_import || "",
          unit_import: found.unit_import || "",
          import_value_fob_usd: found.import_value_fob_usd || "",
          import_value_rs: found.import_value_rs || "",
          job_status: found.job_status || "",
          eft_amount: found.eft_amount || "",
          payment_status: found.payment_status || "",
          payment_requested_by: found.payment_requested_by || "",
          payment_requested_at: found.payment_requested_at || "",
          payment_approved_by: found.payment_approved_by || "",
          payment_approved_at: found.payment_approved_at || "",
          payment_rejection_reason: found.payment_rejection_reason || "",
          payment_document: found.payment_document || "",
          payment_document_name: found.payment_document_name || "",
          import_details_array: Array.isArray(found.import_details_array) && found.import_details_array.length > 0
            ? found.import_details_array
            : [{
                qty_import: found.qty_import || "",
                unit_import: found.unit_import || "",
                import_value_fob_usd: found.import_value_fob_usd || "",
                import_value_rs: found.import_value_rs || "",
                hs_code_import: found.hs_code_import || "",
                item_description_import: found.item_description_import || "",
              }],
          export_details_array: Array.isArray(found.export_details_array) && found.export_details_array.length > 0
            ? found.export_details_array
            : [{
                qty_export: found.qty_export || "",
                unit_export: found.unit_export || "",
                export_value_fob_usd: found.export_value_fob_usd || "",
                export_value_rs: found.export_value_rs || "",
                hs_code_export: found.hs_code_export || "",
                item_description_export: found.item_description_export || "",
              }],
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

  const handleImportDetailChange = (index, field, value) => {
    if (formData.payment_status !== "Payment Approved") {
      showToast("Payment must be approved before editing Quantity & Value Tracking details", "error");
      return;
    }
    const newDetails = [...(formData.import_details_array || [])];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setFormData(prev => ({ ...prev, import_details_array: newDetails }));
  };

  const addImportDetail = () => {
    if (formData.payment_status !== "Payment Approved") {
      showToast("Payment must be approved before adding import items", "error");
      return;
    }
    const newDetails = [...(formData.import_details_array || []), {
      qty_import: "", unit_import: "", import_value_fob_usd: "", import_value_rs: "", hs_code_import: "", item_description_import: ""
    }];
    setFormData(prev => ({ ...prev, import_details_array: newDetails }));
  };

  const removeImportDetail = (index) => {
    if (formData.payment_status !== "Payment Approved" && (formData.job_status || "").toUpperCase() !== "APPROVED") {
      showToast("Payment must be approved before modifying items", "error");
      return;
    }
    const item = (formData.import_details_array || [])[index];
    const hasContent = item && (item.item_description_import || item.hs_code_import || item.qty_import || item.import_value_fob_usd || item.import_value_rs);
    if (hasContent && !window.confirm(`Are you sure you want to remove Import Item #${index + 1}?`)) {
      return;
    }
    const newDetails = [...(formData.import_details_array || [])];
    newDetails.splice(index, 1);
    setFormData(prev => ({ ...prev, import_details_array: newDetails }));
  };

  const handleExportDetailChange = (index, field, value) => {
    if (formData.payment_status !== "Payment Approved" && (formData.job_status || "").toUpperCase() !== "APPROVED") {
      showToast("Payment must be approved before editing Quantity & Value Tracking details", "error");
      return;
    }
    const newDetails = [...(formData.export_details_array || [])];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setFormData(prev => ({ ...prev, export_details_array: newDetails }));
  };

  const addExportDetail = () => {
    if (formData.payment_status !== "Payment Approved" && (formData.job_status || "").toUpperCase() !== "APPROVED") {
      showToast("Payment must be approved before adding export items", "error");
      return;
    }
    const newDetails = [...(formData.export_details_array || []), {
      qty_export: "", unit_export: "", export_value_fob_usd: "", export_value_rs: "", hs_code_export: "", item_description_export: ""
    }];
    setFormData(prev => ({ ...prev, export_details_array: newDetails }));
  };

  const removeExportDetail = (index) => {
    if (formData.payment_status !== "Payment Approved" && (formData.job_status || "").toUpperCase() !== "APPROVED") {
      showToast("Payment must be approved before modifying items", "error");
      return;
    }
    const item = (formData.export_details_array || [])[index];
    const hasContent = item && (item.item_description_export || item.hs_code_export || item.qty_export || item.export_value_fob_usd || item.export_value_rs);
    if (hasContent && !window.confirm(`Are you sure you want to remove Export Item #${index + 1}?`)) {
      return;
    }
    const newDetails = [...(formData.export_details_array || [])];
    newDetails.splice(index, 1);
    setFormData(prev => ({ ...prev, export_details_array: newDetails }));
  };

  const showToast = (message, severity) => {
    setToast({ open: true, message, severity });
    setTimeout(() => setToast({ open: false, message: "", severity: "success" }), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...formData };
      if (formData.payment_status !== "Payment Approved") {
        delete payload.export_details_array;
        delete payload.import_details_array;
        delete payload.qty_export;
        delete payload.unit_export;
        delete payload.export_value_fob_usd;
        delete payload.export_value_rs;
        delete payload.hs_code_export;
        delete payload.item_description_export;
        delete payload.qty_import;
        delete payload.unit_import;
        delete payload.import_value_fob_usd;
        delete payload.import_value_rs;
        delete payload.hs_code_import;
        delete payload.item_description_import;
      }
      await axios.put(`${process.env.REACT_APP_API_STRING}/update-dgft-register/${id}`, payload);
      showToast("DGFT register details saved", "success");
      setRow((prev) => ({ ...prev, ...formData }));
    } catch (err) {
      console.error(err);
      showToast("Failed to save details", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSubmitModal = () => {
    const eftVal = (formData.eft_amount || "").trim();
    if (!eftVal) {
      showToast("Please enter an EFT Amount before requesting payment", "error");
      return;
    }
    setConfirmSubmitModalOpen(true);
  };

  const handleConfirmSubmitPayment = async () => {
    const eftVal = (formData.eft_amount || "").trim();
    setRequestingPayment(true);
    try {
      const res = await axios.put(`${process.env.REACT_APP_API_STRING}/dgft-request-payment/${id}`, {
        eft_amount: eftVal,
        requested_by: user?.username || user?.first_name || "User",
      });
      showToast("Payment request submitted. Status updated to PAYMENT REQUESTED.", "success");
      setConfirmSubmitModalOpen(false);
      if (res.data?.data) {
        setFormData(prev => ({
          ...prev,
          ...res.data.data,
          job_status: "PAYMENT REQUESTED",
          payment_status: "Payment Requested",
        }));
        setRow(prev => ({
          ...prev,
          ...res.data.data,
          job_status: "PAYMENT REQUESTED",
          payment_status: "Payment Requested",
        }));
      } else {
        fetchDetails();
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to submit payment request", "error");
    } finally {
      setRequestingPayment(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    const fd = new FormData();
    fd.append("files", file);
    fd.append("bucketPath", "dgft/payment-documents");

    try {
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data.urls?.[0];
      if (url) {
        setFormData(prev => ({
          ...prev,
          payment_document: url,
          payment_document_name: file.name,
        }));
        showToast("Payment document uploaded. Click 'Save Changes' to save.", "success");
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || err.response?.data?.message || "Failed to upload document", "error");
    } finally {
      setUploadingDoc(false);
      if (docFileInputRef.current) docFileInputRef.current.value = "";
    }
  };

  const handleOpenRemoveDocModal = () => {
    setRemoveDocModalOpen(true);
  };

  const handleConfirmRemoveDoc = () => {
    setFormData(prev => ({
      ...prev,
      payment_document: "",
      payment_document_name: "",
    }));
    setRemoveDocModalOpen(false);
    showToast("Payment document removed. Click 'Save Changes' to save.", "info");
  };

  const handleDownloadDocument = async (url, fileName) => {
    if (!url) return;
    try {
      showToast("Starting download...", "info");
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "Payment_Document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast("Download completed", "success");
    } catch (error) {
      console.error("Download error:", error);
      window.open(url, "_blank");
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
            <div className="ap-card-title">Validity</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid cols-4">
              <div className="ap-field-group">
                <label className="ap-field-label">Import Validity</label>
                <input type="date" className="ap-field-input" value={formData.import_validity || ""} onChange={(e) => hc("import_validity", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Export Validity</label>
                <input type="date" className="ap-field-input" value={formData.export_validity || ""} onChange={(e) => hc("export_validity", e.target.value)} />
              </div>
              {/* <div className="ap-field-group">
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
              </div> */}
              {/* <div className="ap-field-group">
                <label className="ap-field-label">Item Description (Export)</label>
                <textarea className="ap-field-textarea" rows={3} value={formData.item_description_export || ""} onChange={(e) => hc("item_description_export", e.target.value)} />
              </div> */}
              {/* <div className="ap-field-group">
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
              </div> */}
              {/* <div className="ap-field-group">
                <label className="ap-field-label">Item Description (Import)</label>
                <textarea className="ap-field-textarea" rows={3} value={formData.item_description_import || ""} onChange={(e) => hc("item_description_import", e.target.value)} />
              </div> */}
            </div>
          </div>
        </div>

        {/* Payment Status Banner */}
        {formData.payment_status && (
          <div className="ap-card" style={{ borderLeft: formData.payment_status === "Payment Approved" ? "4px solid #059669" : formData.payment_status === "Payment Rejected" ? "4px solid #dc2626" : "4px solid #f59e0b" }}>
            <div className="ap-card-body" style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <span style={{
                  padding: "4px 14px",
                  borderRadius: "14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  ...(formData.payment_status === "Payment Requested" ? { background: "#fef3c7", color: "#92400e" } :
                     formData.payment_status === "Payment Approved" ? { background: "#d1fae5", color: "#065f46" } :
                     formData.payment_status === "Payment Rejected" ? { background: "#fee2e2", color: "#991b1b" } :
                     { background: "#f3f4f6", color: "#4b5563" })
                }}>
                  {formData.payment_status}
                </span>
                {formData.payment_requested_by && (
                  <span style={{ fontSize: "11px", color: "#475569", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span>👤</span> Requested by: <strong style={{ color: "#1e293b" }}>{formData.payment_requested_by}</strong>
                    {formData.payment_requested_at && (
                      <span style={{ color: "#64748b" }}>
                        on {new Date(formData.payment_requested_at).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </span>
                )}
                {formData.payment_approved_by && (formData.payment_status === "Payment Approved" || formData.payment_status === "Payment Rejected") && (
                  <span style={{ fontSize: "11px", color: "#475569", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span>•</span>
                    <span>{formData.payment_status === "Payment Approved" ? "✓" : "✕"}</span>
                    {formData.payment_status === "Payment Approved" ? "Approved" : "Rejected"} by: <strong style={{ color: "#1e293b" }}>{formData.payment_approved_by}</strong>
                    {formData.payment_approved_at && (
                      <span style={{ color: "#64748b" }}>
                        on {new Date(formData.payment_approved_at).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </span>
                )}
                {formData.payment_status === "Payment Rejected" && formData.payment_rejection_reason && (
                  <span style={{ fontSize: "11px", color: "#991b1b", background: "#fef2f2", padding: "2px 8px", borderRadius: "4px", border: "1px solid #fecaca" }}>
                    Reason: <strong>{formData.payment_rejection_reason}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Payment Details</div>
          </div>
          <div className="ap-card-body">
            <div className="ap-fields-grid cols-3">
              {/* EFT Amount + Submit Payment Request */}
              <div className="ap-field-group">
                <label className="ap-field-label">EFT Amount</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    className="ap-field-input"
                    value={formData.eft_amount || ""}
                    onChange={(e) => hc("eft_amount", e.target.value)}
                    placeholder="Enter amount"
                    disabled={formData.payment_status === "Payment Requested"}
                    style={formData.payment_status === "Payment Requested" ? { background: "#f3f4f6", color: "#9ca3af" } : {}}
                  />
                  {(!formData.payment_status || formData.payment_status === "Payment Rejected") && (
                    <button
                      onClick={handleOpenSubmitModal}
                      disabled={requestingPayment}
                      style={{
                        padding: "6px 14px",
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: requestingPayment ? "not-allowed" : "pointer",
                        whiteSpace: "nowrap",
                        opacity: requestingPayment ? 0.6 : 1,
                      }}
                    >
                      {requestingPayment ? "Submitting..." : formData.payment_status === "Payment Rejected" ? "Re-Submit Request" : "Submit Payment Request"}
                    </button>
                  )}
                  {formData.payment_status === "Payment Requested" && (
                    <span style={{ fontSize: "11px", color: "#b45309", fontWeight: "600", background: "#fef3c7", padding: "5px 12px", borderRadius: "4px", border: "1px solid #fcd34d", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      ⏳ Payment Requested (Awaiting Approval)
                    </span>
                  )}
                  {formData.payment_status === "Payment Approved" && (
                    <span style={{ fontSize: "11px", color: "#15803d", fontWeight: "600", background: "#dcfce7", padding: "4px 8px", borderRadius: "4px", border: "1px solid #86efac" }}>
                      ✓ Payment Approved
                    </span>
                  )}
                </div>
              </div>
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
              {/* <div className="ap-field-group">
                <label className="ap-field-label">Payment Details</label>
                <input className="ap-field-input" value={formData.payment_details || ""} onChange={(e) => hc("payment_details", e.target.value)} />
              </div> */}
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
              <div className="ap-field-group">
                <label className="ap-field-label">Accounts Invoice Number</label>
                <input className="ap-field-input" value={formData.accounts_inv_no || ""} onChange={(e) => hc("accounts_inv_no", e.target.value)} />
              </div>
              <div className="ap-field-group">
                <label className="ap-field-label">Accounts Invoice Date</label>
                <input type="date" className="ap-field-input" value={formData.accounts_inv_date || ""} onChange={(e) => hc("accounts_inv_date", e.target.value)} />
              </div>

              {/* Payment Document Upload — ONLY when payment is approved */}
              {(formData.payment_status === "Payment Approved" || (formData.job_status || "").toUpperCase() === "APPROVED") && (
                <div className="ap-field-group" style={{ gridColumn: "span 3", marginTop: "8px" }}>
                  <label className="ap-field-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: "700", color: "#1e293b" }}>📎 Payment / Accounts Document</span>
                    {formData.payment_document && (
                      <span style={{ fontSize: "11px", color: "#15803d", fontWeight: "600", background: "#dcfce7", padding: "2px 8px", borderRadius: "12px", border: "1px solid #86efac" }}>
                        ✓ Uploaded
                      </span>
                    )}
                  </label>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    background: "#f8fafc",
                    border: "1.5px dashed #cbd5e1",
                    borderRadius: "6px",
                    flexWrap: "wrap"
                  }}>
                    <input
                      ref={docFileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx,.doc"
                      style={{ display: "none" }}
                      onChange={handleDocumentUpload}
                    />
                    <button
                      type="button"
                      onClick={() => docFileInputRef.current && docFileInputRef.current.click()}
                      disabled={uploadingDoc}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 14px",
                        background: uploadingDoc ? "#94a3b8" : "#0284c7",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: uploadingDoc ? "not-allowed" : "pointer"
                      }}
                    >
                      <span>{uploadingDoc ? "⏳" : "↑"}</span>
                      {uploadingDoc ? "Uploading..." : formData.payment_document ? "Replace Document" : "Upload Document"}
                    </button>

                    {formData.payment_document ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "220px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12px", color: "#334155", fontWeight: "600", wordBreak: "break-all" }}>
                          📄 {formData.payment_document_name || "Payment_Document"}
                        </span>
                        <a
                          href={formData.payment_document}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: "11px",
                            color: "#2563eb",
                            textDecoration: "none",
                            fontWeight: "600",
                            padding: "3px 10px",
                            background: "#eff6ff",
                            borderRadius: "4px",
                            border: "1px solid #bfdbfe",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <span>👁️</span> View
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(formData.payment_document, formData.payment_document_name)}
                          style={{
                            fontSize: "11px",
                            color: "#059669",
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            borderRadius: "4px",
                            fontWeight: "600",
                            padding: "3px 10px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer"
                          }}
                        >
                          <span>⬇️</span> Download
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenRemoveDocModal}
                          title="Remove Document"
                          style={{
                            background: "#fee2e2",
                            border: "1px solid #fecaca",
                            color: "#dc2626",
                            borderRadius: "4px",
                            fontSize: "11px",
                            padding: "3px 8px",
                            cursor: "pointer",
                            fontWeight: "600"
                          }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        Attach payment receipt, bank challan, or invoice (PDF, Images, Excel, Word)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quantity & Value Tracking — ONLY shown after payment is approved */}
        {(() => {
          const isPaymentApproved = formData.payment_status === "Payment Approved" || (formData.job_status || "").toUpperCase() === "APPROVED";
          if (!isPaymentApproved) return null;

          return (
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title">Quantity &amp; Value Tracking</div>
              </div>
              <div className="ap-card-body">
                <div className="ap-section-subtitle" style={{ marginBottom: '12px' }}>Export Details</div>
                {(formData.export_details_array || []).map((row, idx) => (
                  <div key={idx} className="ap-item-row-compact cols-6">
                    <div className="ap-field-group">
                      <label className="ap-field-label">Item Description (Export)</label>
                      <textarea
                        className="ap-field-textarea"
                        value={row.item_description_export}
                        onChange={e => handleExportDetailChange(idx, "item_description_export", e.target.value)}
                        placeholder="Export description..."
                      />
                    </div>
                    <div className="ap-field-group">
                      <label className="ap-field-label">HS Code</label>
                      <HSCodeAutocomplete
                        value={row.hs_code_export}
                        onChange={v => handleExportDetailChange(idx, "hs_code_export", v)}
                      />
                    </div>
                    <div className="ap-field-group">
                      <label className="ap-field-label">Qty (Export)</label>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <input
                          type="text"
                          className="ap-field-input"
                          value={row.qty_export}
                          onChange={e => handleExportDetailChange(idx, "qty_export", e.target.value)}
                          placeholder="0.00"
                          style={{ flex: 2 }}
                        />
                        <div style={{ flex: 1.5 }}>
                          <UnitAutocomplete
                            value={row.unit_export}
                            onChange={v => handleExportDetailChange(idx, "unit_export", v)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="ap-field-group">
                      <label className="ap-field-label">Value (FOB USD)</label>
                      <input
                        type="text"
                        className="ap-field-input"
                        value={row.export_value_fob_usd}
                        onChange={e => handleExportDetailChange(idx, "export_value_fob_usd", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="ap-field-group">
                      <label className="ap-field-label">Value (Rs)</label>
                      <input
                        type="text"
                        className="ap-field-input"
                        value={row.export_value_rs}
                        onChange={e => handleExportDetailChange(idx, "export_value_rs", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    {idx > 0 ? (
                      <button
                        type="button"
                        className="ap-remove-row-btn"
                        onClick={() => removeExportDetail(idx)}
                        title="Remove Item"
                      >
                        ✕
                      </button>
                    ) : (
                      <div style={{ width: '28px' }}></div>
                    )}
                  </div>
                ))}
                <div style={{ marginTop: '8px', marginBottom: '24px' }}>
                  <button
                    type="button"
                    className="ap-btn secondary"
                    onClick={addExportDetail}
                    style={{
                      padding: '4px 12px',
                      height: '28px',
                      fontSize: '12px',
                      background: '#e2e8f0',
                      color: '#334155',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Export Item
                  </button>
                </div>

                <div className="ap-section-subtitle" style={{ marginBottom: '12px' }}>Import Details</div>
                {(formData.import_details_array || []).map((row, idx) => (
                  <div key={idx} className="ap-item-row-compact cols-6">
                    <div className="ap-field-group">
                      <label className="ap-field-label">Item Description (Import)</label>
                      <textarea
                        className="ap-field-textarea"
                        value={row.item_description_import}
                        onChange={e => handleImportDetailChange(idx, "item_description_import", e.target.value)}
                        placeholder="Import description..."
                      />
                    </div>
                    <div className="ap-field-group">
                      <label className="ap-field-label">HS Code</label>
                      <HSCodeAutocomplete
                        value={row.hs_code_import}
                        onChange={v => handleImportDetailChange(idx, "hs_code_import", v)}
                      />
                    </div>
                    <div className="ap-field-group">
                      <label className="ap-field-label">Qty (Import)</label>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <input
                          type="text"
                          className="ap-field-input"
                          value={row.qty_import}
                          onChange={e => handleImportDetailChange(idx, "qty_import", e.target.value)}
                          placeholder="0.00"
                          style={{ flex: 2 }}
                        />
                        <div style={{ flex: 1.5 }}>
                          <UnitAutocomplete
                            value={row.unit_import}
                            onChange={v => handleImportDetailChange(idx, "unit_import", v)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="ap-field-group">
                      <label className="ap-field-label">Value (FOB USD)</label>
                      <input
                        type="text"
                        className="ap-field-input"
                        value={row.import_value_fob_usd}
                        onChange={e => handleImportDetailChange(idx, "import_value_fob_usd", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="ap-field-group">
                      <label className="ap-field-label">Value (Rs)</label>
                      <input
                        type="text"
                        className="ap-field-input"
                        value={row.import_value_rs}
                        onChange={e => handleImportDetailChange(idx, "import_value_rs", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    {idx > 0 ? (
                      <button
                        type="button"
                        className="ap-remove-row-btn"
                        onClick={() => removeImportDetail(idx)}
                        title="Remove Item"
                      >
                        ✕
                      </button>
                    ) : (
                      <div style={{ width: '28px' }}></div>
                    )}
                  </div>
                ))}
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    className="ap-btn secondary"
                    onClick={addImportDetail}
                    style={{
                      padding: '4px 12px',
                      height: '28px',
                      fontSize: '12px',
                      background: '#e2e8f0',
                      color: '#334155',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Import Item
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="ap-floating-save">
        <span className="ap-floating-save-meta">{saving ? "Saving..." : "Ready to save"}</span>
        <button className="ap-btn primary ap-floating-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* ── Submit Payment Request Confirmation Modal ── */}
      <Dialog
        open={confirmSubmitModalOpen}
        onClose={() => setConfirmSubmitModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "10px", overflow: "hidden" }
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#eff6ff",
            borderBottom: "1px solid #bfdbfe",
            py: 1.5,
            px: 2.5,
            color: "#1e40af",
            fontWeight: "700",
            fontSize: "16px"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>💳</span> Submit Payment Request
          </span>
          <IconButton onClick={() => setConfirmSubmitModalOpen(false)} size="small" sx={{ color: "#1e40af" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <p style={{ margin: "0 0 14px 0", fontSize: "13px", color: "#374151" }}>
            Are you sure you want to submit a payment request for this DGFT job?
          </p>
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "14px 18px", marginBottom: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
              <div>
                <span style={{ color: "#6b7280", display: "block" }}>Job Number:</span>
                <strong style={{ color: "#111827", fontSize: "13px" }}>{jobNoClean}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280", display: "block" }}>Firm / Party Name:</span>
                <strong style={{ color: "#111827" }}>{formData.party_name || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280", display: "block" }}>Scheme:</span>
                <strong style={{ color: "#111827" }}>{formData.scheme || formData.category || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#6b7280", display: "block" }}>EFT Amount:</span>
                <strong style={{ color: "#2563eb", fontSize: "15px" }}>
                  ₹ {Number(formData.eft_amount || 0).toLocaleString("en-IN")}
                </strong>
              </div>
            </div>
          </div>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "10px 14px", fontSize: "11px", color: "#1e40af" }}>
            ℹ️ <strong>Note:</strong> Once submitted, the job status will transition to <strong>PAYMENT REQUESTED</strong> and move to the Payment Requested stage card for approval.
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
          <Button onClick={() => setConfirmSubmitModalOpen(false)} variant="outlined" size="small" sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSubmitPayment}
            variant="contained"
            size="small"
            disabled={requestingPayment}
            sx={{
              background: "#2563eb",
              "&:hover": { background: "#1d4ed8" },
              textTransform: "none",
              fontWeight: "600",
              px: 2
            }}
          >
            {requestingPayment ? "Submitting..." : "Confirm & Submit Request"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Document Confirmation Modal */}
      <Dialog
        open={removeDocModalOpen}
        onClose={() => setRemoveDocModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px", overflow: "hidden" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1, borderBottom: "1px solid #fee2e2", background: "#fef2f2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#991b1b", fontWeight: "700", fontSize: "15px" }}>
            <span>🗑️</span> Confirm Document Removal
          </div>
          <IconButton size="small" onClick={() => setRemoveDocModalOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#374151" }}>
            Are you sure you want to remove the attached payment document?
          </p>
          {formData.payment_document_name && (
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: "#4b5563" }}>
              📄 <strong>{formData.payment_document_name}</strong>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
          <Button onClick={() => setRemoveDocModalOpen(false)} variant="outlined" size="small" sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRemoveDoc}
            variant="contained"
            color="error"
            size="small"
            sx={{ textTransform: "none", fontWeight: "600" }}
          >
            🗑 Remove Document
          </Button>
        </DialogActions>
      </Dialog>

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
