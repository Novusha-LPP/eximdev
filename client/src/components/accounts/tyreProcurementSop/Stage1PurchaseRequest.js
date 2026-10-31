import { COMPANY_PROFILES, COMPANY_OPTIONS, getCompanyProfile } from "./companyProfiles";
import React, { useState, useEffect, useCallback, useContext, useRef } from "react";
import axios from "axios";
import ApproverPairSelector from "./ApproverPairSelector";
import { Add, Delete, CloudUpload, InsertDriveFile, CheckCircle, Lock, OpenInNew } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { UserContext } from "../../../contexts/UserContext";
import "../../../styles/enterprise-sop.scss";

function Stage1PurchaseRequest({ data = {}, onChange, globalData = {}, onGlobalChange }) {
  const { user } = useContext(UserContext);
  const [savedProducts, setSavedProducts] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef(null);

  const isProcAdmin = user?.role === "Admin" || user?.tyre_procurement_admin;
  const assignedCompanies = user?.assigned_procurement_companies || [];
  const allowedCompanyOptions = !isProcAdmin && assignedCompanies.length > 0
    ? COMPANY_OPTIONS.filter((opt) => assignedCompanies.includes(opt.value))
    : COMPANY_OPTIONS;

  const currentCompanyKey = globalData?.companyKey || data.companyKey || (globalData?.companyName ? getCompanyProfile(globalData.companyName).id : (allowedCompanyOptions[0]?.value || "SURAVIO"));
  const compProfile = getCompanyProfile(currentCompanyKey);
  const [uploadingProof, setUploadingProof] = useState(false);

  const fetchAutoNumbers = useCallback(async (forcedCompanyCode) => {
    try {
      const today = data.prDate ? data.prDate.split("T")[0] : new Date().toISOString().split("T")[0];
      const compCode = forcedCompanyCode || compProfile.shortName || compProfile.id || "SFPL";
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/next-numbers?date=${today}&companyShortName=${compCode}`);
      if (res.data?.success) {
        if (onGlobalChange) {
          if (res.data.prNumber) onGlobalChange("prNumber", res.data.prNumber);
          if (res.data.poNumber) onGlobalChange("poNumber", res.data.poNumber);
          if (res.data.companyShortName) onGlobalChange("companyShortName", res.data.companyShortName);
        }
        if (!data.prDate) {
          onChange({ prDate: today });
        }
      }
    } catch (err) {
      console.error("Error auto-fetching PR/PO numbers:", err);
    }
  }, [data.prDate, compProfile.shortName, compProfile.id, onGlobalChange, onChange]);

  useEffect(() => {
    if (!globalData?.prNumber) {
      fetchAutoNumbers();
    }
  }, [globalData?.prNumber, fetchAutoNumbers]);

  // Auto-fetch Prepared By and Contact Number from logged-in user KYC profile
  useEffect(() => {
    if (user) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username || "";
      const contact = user.mobile || user.phone || "";
      const updates = {};
      if (!data.preparedBy && fullName) {
        updates.preparedBy = fullName.toUpperCase();
      }
      if (!data.contactNumber && contact) {
        updates.contactNumber = contact;
      }
      if (Object.keys(updates).length > 0) {
        onChange(updates);
      }
    }
  }, [user, data.preparedBy, data.contactNumber, onChange]);

  useEffect(() => {
    // Fetch saved generic procurement products from backend
    axios
      .get(`${process.env.REACT_APP_API_STRING}/procurement-products`)
      .then((res) => {
        if (res.data?.products) {
          setSavedProducts(res.data.products);
        }
      })
      .catch((err) => {
        console.error("Error fetching saved procurement products:", err);
      });
  }, []);

  const updateField = (field, value) => {
    const val = typeof value === "string" ? value.toUpperCase() : value;
    onChange({ [field]: val });
  };

  const itemsRequired = data.itemsRequired || [];
  const routingChecklist = data.routingChecklist || [];
  const attachments = data.attachments || [];

  const handleCompanyChange = (e) => {
    const key = e.target.value;
    const profile = getCompanyProfile(key);

    const defaultHodName = profile.settings?.hodApproverName || "MOHIT SINGH";
    const defaultHodDesig = profile.settings?.hodApproverDesignation || "CEO";

    if (onGlobalChange) {
      onGlobalChange("companyKey", profile.id);
      onGlobalChange("companyShortName", profile.shortName || profile.id);
      onGlobalChange("companyName", profile.name);
      onGlobalChange("buyerName", profile.name);
      onGlobalChange("companyAddress", `${profile.buyerAddress1} ${profile.buyerAddress2} ${profile.buyerCityState}`.trim());
      onGlobalChange("companyPan", profile.buyerPan);
      onGlobalChange("companyGstin", profile.buyerGstin);
      onGlobalChange("companyEmail", profile.buyerEmail);
      onGlobalChange("companyPhone", profile.buyerPhone);
      if (profile.defaultPoFormatStyle) {
        onGlobalChange("poFormatStyle", profile.defaultPoFormatStyle);
      }
      if (defaultHodName && (!globalData?.checkedBy || globalData.checkedBy === "MOHIT SINGH" || globalData.checkedBy === "RAJAN SHAH" || globalData.checkedBy === "RAUF KHAN")) {
        onGlobalChange("checkedBy", defaultHodName);
        onGlobalChange("checkedByDesignation", defaultHodDesig);
      }
    }

    const defaultBranch = (profile.branches && profile.branches.length > 0) ? profile.branches[0] : profile.name;

    const stageUpdates = {
      companyKey: profile.id,
      companyShortName: profile.shortName || profile.id,
      companyName: profile.name,
      departmentLocation: defaultBranch,
    };

    if (defaultHodName && (!data.checkedBy || data.checkedBy === "MOHIT SINGH" || data.checkedBy === "RAJAN SHAH" || data.checkedBy === "RAUF KHAN")) {
      stageUpdates.checkedBy = defaultHodName;
      stageUpdates.checkedByDesignation = defaultHodDesig;
      stageUpdates.hodValidation = {
        ...(data.hodValidation || {}),
        validatedBy: defaultHodName,
        designation: defaultHodDesig,
      };
    }

    const isDefaultOrEmpty =
      !data.deliveryLocation ||
      Object.values(COMPANY_PROFILES).some((p) => p.defaultDeliveryLocation === data.deliveryLocation);

    if (isDefaultOrEmpty) {
      stageUpdates.deliveryLocation = profile.defaultDeliveryLocation;
      stageUpdates.deliveryContact = profile.defaultDeliveryContact;
      stageUpdates.deliveryContactPerson = profile.defaultDeliveryContact;
    }

    onChange(stageUpdates);

    // Refresh sequential numbers for the newly selected company if still in draft
    if (!globalData?.status || globalData.status === "Draft") {
      fetchAutoNumbers(profile.shortName || profile.id);
    }
  };

  // Auto-select company if only 1 company is assigned to non-admin user
  useEffect(() => {
    if (!isProcAdmin && allowedCompanyOptions.length === 1) {
      const singleComp = allowedCompanyOptions[0].value;
      if (currentCompanyKey !== singleComp) {
        handleCompanyChange({ target: { value: singleComp } });
      }
    }
  }, [isProcAdmin, allowedCompanyOptions, currentCompanyKey]);

  // Approval proof upload handler
  const handleApprovalProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("Proof file size must be less than 15MB");
      return;
    }
    const formData = new FormData();
    formData.append("files", file);
    try {
      setUploadingProof(true);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/tyre-procurement/upload-attachment`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data?.success && res.data.attachments?.[0]) {
        const att = res.data.attachments[0];
        const proofObj = {
          fileName: att.fileName || file.name,
          fileUrl: att.fileUrl || att.url,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.username || "",
        };
        onChange({ approvalProof: proofObj });
        if (onGlobalChange) onGlobalChange("approvalProof", proofObj);
      }
    } catch (err) {
      console.error("Error uploading approval proof:", err);
      alert("Failed to upload approval proof: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadingProof(false);
      e.target.value = "";
    }
  };

  const applyCompanyDefaultLocation = () => {
    const defaultBranch = (compProfile.branches && compProfile.branches.length > 0) ? compProfile.branches[0] : compProfile.name;
    onChange({
      deliveryLocation: compProfile.defaultDeliveryLocation,
      deliveryContact: compProfile.defaultDeliveryContact,
      deliveryContactPerson: compProfile.defaultDeliveryContact,
      departmentLocation: defaultBranch,
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (attachments.length + files.length > 10) {
      alert("Maximum 10 attachments allowed per Purchase Request.");
      return;
    }

    const oversized = files.find((f) => f.size > 10 * 1024 * 1024);
    if (oversized) {
      alert(`File "${oversized.name}" exceeds the maximum 10MB limit.`);
      return;
    }

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      setUploadingFiles(true);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/tyre-procurement/upload-attachment`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data?.success && res.data.attachments) {
        const updated = [...attachments, ...res.data.attachments];
        onChange({ attachments: updated });
        if (onGlobalChange) onGlobalChange("attachments", updated);
      }
    } catch (err) {
      console.error("Error uploading attachments:", err);
      alert("Attachment upload failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (idx) => {
    const updated = attachments.filter((_, i) => i !== idx);
    onChange({ attachments: updated });
    if (onGlobalChange) onGlobalChange("attachments", updated);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const saveProductDetails = (item) => {
    if (!item) return;
    const prodName = (item.productName || item.tyreType || "").trim().toUpperCase();
    if (!prodName) return;

    axios
      .post(`${process.env.REACT_APP_API_STRING}/procurement-products`, {
        productName: prodName,
        brandPreference: (item.brandPreference || "").trim().toUpperCase(),
        specification: (item.specification || item.sizeSpec || "").trim().toUpperCase(),
        estUnitCost: Number(item.estUnitCost) || 0,
      })
      .then((res) => {
        if (res.data?.product) {
          setSavedProducts((prev) => {
            const exists = prev.some((p) => (p.productName || "").toUpperCase() === prodName);
            if (exists) {
              return prev.map((p) =>
                (p.productName || "").toUpperCase() === prodName ? res.data.product : p
              );
            }
            return [...prev, res.data.product];
          });
        }
      })
      .catch((err) => {
        console.error("Error auto-saving procurement product:", err);
      });
  };

  const updateItem = (idx, field, value) => {
    const val = typeof value === "string" ? value.toUpperCase() : value;

    const updated = itemsRequired.map((item, i) => {
      if (i === idx) {
        const nextItem = { ...item, [field]: val };
        // Sync productName with tyreType for backward compatibility
        if (field === "productName") {
          nextItem.tyreType = val;
          const matched = savedProducts.find(
            (p) => (p.productName || "").toUpperCase() === val.trim().toUpperCase()
          );
          if (matched) {
            if (!nextItem.brandPreference && matched.brandPreference) {
              nextItem.brandPreference = matched.brandPreference;
            }
            if (!nextItem.specification && !nextItem.sizeSpec && matched.specification) {
              nextItem.specification = matched.specification;
              nextItem.sizeSpec = matched.specification;
            }
            if (!nextItem.estUnitCost && matched.estUnitCost) {
              nextItem.estUnitCost = matched.estUnitCost;
            }
          }
        } else if (field === "tyreType") {
          nextItem.productName = val;
        } else if (field === "specification") {
          nextItem.sizeSpec = val;
        } else if (field === "sizeSpec") {
          nextItem.specification = val;
        }
        return nextItem;
      }
      return item;
    });
    onChange({ itemsRequired: updated });
  };

  const addItem = () => {
    onChange({
      itemsRequired: [
        ...itemsRequired,
        { sNo: itemsRequired.length + 1, productName: "", tyreType: "" },
      ],
    });
  };

  const removeItem = (idx) => {
    onChange({ itemsRequired: itemsRequired.filter((_, i) => i !== idx) });
  };

  const handleChecklistToggle = async (idx, checked) => {
    const today = new Date().toISOString().split("T")[0];
    const resp = routingChecklist[idx]?.responsible || data.checkedBy || compProfile.settings?.responsibleTeam || "Operations Team";
    const defaultSteps = [
      { step: "Step 1", action: "PR Raised by Requester", responsible: resp },
    ];
    const current = [...routingChecklist];
    while (current.length <= idx) {
      current.push(defaultSteps[current.length] || { step: `Step ${current.length + 1}`, action: "", responsible: resp });
    }

    if (checked) {
      current[idx] = { ...current[idx], date: today, status: "Done", responsible: resp };
      if (idx === 0) {
        let generatedPr = globalData?.prNumber;
        let generatedPo = globalData?.poNumber;

        const isMockOrEmpty =
          !generatedPr ||
          generatedPr.startsWith("TT-TYRE-") ||
          generatedPr.startsWith("TT/TYRE/") ||
          !generatedPr.includes("/");

        if (isMockOrEmpty) {
          try {
            const compCode = compProfile.shortName || compProfile.id || "SFPL";
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/next-numbers?date=${today}&companyShortName=${compCode}`);
            if (res.data?.success) {
              generatedPr = res.data.prNumber;
              generatedPo = res.data.poNumber;
            }
          } catch (err) {
            console.error("Error generating PR/PO numbers:", err);
            const mShort = new Date(today).toLocaleString("en-US", { month: "short" }).toUpperCase();
            const compCode = compProfile.shortName || compProfile.id || "SFPL";
            generatedPr = `PR/${compCode}/${mShort}-01/26-27`;
            generatedPo = `PO/${compCode}/${mShort}-01/26-27`;
          }
        }

        if (onGlobalChange) {
          if (generatedPr) onGlobalChange("prNumber", generatedPr);
          if (generatedPo) onGlobalChange("poNumber", generatedPo);
          onGlobalChange("status", "PR Raised");
        }

        onChange({
          routingChecklist: current,
          prDate: today,
        });
        return;
      }
    } else {
      current[idx] = { ...current[idx], date: "", status: "Pending" };
      if (idx === 0) {
        if (onGlobalChange) onGlobalChange("status", "Draft");
      }
    }
    onChange({ routingChecklist: current });
  };

  // Compute total
  let totalCost = 0;
  itemsRequired.forEach((item) => {
    totalCost += (Number(item.qty) || 0) * (Number(item.estUnitCost) || 0);
  });

  const showDeliveryLocation = compProfile.settings?.showDeliveryLocation !== false;
  const showDeliveryContact = compProfile.settings?.showDeliveryContact !== false;
  const showSectionC = Boolean(compProfile.settings?.showSectionC);
  const showSectionD = Boolean(compProfile.settings?.showSectionD);
  const responsibleTeam = compProfile.settings?.responsibleTeam || "Operations Team";

  return (
    <div className="sop-container">
      {/* Section A: Purchase Request Identity (Full Width Header Card) */}
      <div className="sop-card">
        <div className="sop-card-title">
          <span>A. Purchase Request Identity</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "10px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
              }}
            >
              {globalData?.status || "Draft"}
            </span>
          </div>
        </div>

        {/* Company-wise Purchasing Entity Spotlight Banner (PO Layout Selection moved to Stage 2) */}
        <div
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            border: "2px solid #3b82f6",
            borderLeft: "6px solid #1d4ed8",
            borderRadius: "8px",
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.12)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontWeight: 800, fontSize: "13.5px", color: "#1e3a8a", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🏢</span>
              <span>Purchasing Company (Buyer Entity)</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
                }}
              >
                Code: {compProfile.shortName || compProfile.id}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "center" }}>
            <select
              className="sop-input"
              style={{
                fontWeight: 700,
                fontSize: "14px",
                height: "40px",
                borderColor: "#2563eb",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                cursor: "pointer",
              }}
              value={currentCompanyKey}
              onChange={handleCompanyChange}
            >
              {allowedCompanyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={applyCompanyDefaultLocation}
              title="Click to sync official delivery site location and contact from this company profile"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#1d4ed8",
                backgroundColor: "#ffffff",
                border: "1.5px dashed #3b82f6",
                borderRadius: "6px",
                padding: "8px 12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease",
                height: "40px",
                whiteSpace: "nowrap",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#eff6ff";
                e.currentTarget.style.borderColor = "#1d4ed8";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.borderColor = "#3b82f6";
              }}
            >
              <span>⚡ Sync Site Defaults</span>
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              fontSize: "11.5px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #bfdbfe",
                padding: "3px 8px",
                borderRadius: "4px",
                color: "#1e40af",
                fontWeight: 700,
              }}
            >
              <span>🧾 GSTIN:</span>
              <span style={{ fontFamily: "monospace", letterSpacing: "0.4px" }}>
                {compProfile.buyerGstin || "N/A"}
              </span>
            </span>

            {compProfile.buyerPan && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #bfdbfe",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  color: "#0f766e",
                  fontWeight: 700,
                }}
              >
                <span>💳 PAN:</span>
                <span style={{ fontFamily: "monospace", letterSpacing: "0.4px" }}>
                  {compProfile.buyerPan}
                </span>
              </span>
            )}

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #bfdbfe",
                padding: "3px 8px",
                borderRadius: "4px",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              <span>✉️</span>
              <span>{compProfile.buyerEmail || "purchase@surajgroupofcompanies.com"}</span>
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #bfdbfe",
                padding: "3px 8px",
                borderRadius: "4px",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              <span>📞</span>
              <span>{compProfile.buyerPhone || "99980 27301 / 99243 01166"}</span>
            </span>
          </div>
        </div>

        <div className="sop-grid-4">
          <div className="sop-field-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
              <label className="sop-field-label" style={{ marginBottom: 0 }}>PR Number</label>
              {!globalData?.prNumber && (
                <button
                  type="button"
                  onClick={() => fetchAutoNumbers()}
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#2563eb",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "4px",
                    padding: "1px 6px",
                    cursor: "pointer",
                  }}
                >
                  ⚡ Auto-Generate
                </button>
              )}
            </div>
            <input
              className="sop-input"
              value={globalData?.prNumber || ""}
              onChange={(e) => onGlobalChange && onGlobalChange("prNumber", e.target.value)}
              placeholder="Auto-generating..."
              style={{ fontWeight: 700, color: "#0f172a" }}
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">PO Number (Auto)</label>
            <input
              className="sop-input"
              value={globalData?.poNumber || ""}
              readOnly
              placeholder="Auto-generating..."
              style={{ fontWeight: 700, color: "#047857", backgroundColor: "#f8fafc" }}
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">PR Date</label>
            <input
              type="date"
              className="sop-input"
              value={data.prDate ? data.prDate.split("T")[0] : ""}
              onChange={(e) => updateField("prDate", e.target.value)}
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">Needed By Date</label>
            <input
              type="date"
              className="sop-input"
              value={data.neededByDate ? data.neededByDate.split("T")[0] : ""}
              onChange={(e) => updateField("neededByDate", e.target.value)}
            />
            <span style={{ fontSize: "10.5px", color: "#64748b", display: "block", marginTop: "3px" }}>
              ℹ️ Informational only · TAT counted from PR date to GRN date
            </span>
          </div>
        </div>

        <div className="sop-grid-3">
          <div className="sop-field-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="sop-field-label">Prepared By</label>
              <span style={{ fontSize: "10px", color: "#047857", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
                <Lock sx={{ fontSize: 11 }} /> KYC Auto-Fetched
              </span>
            </div>
            <input
              className="sop-input"
              value={data.preparedBy || ""}
              readOnly
              placeholder="Auto-fetched from KYC..."
              style={{ fontWeight: 700, backgroundColor: "#f8fafc", color: "#1e293b", cursor: "not-allowed" }}
            />
          </div>
          <div className="sop-field-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="sop-field-label">Contact Number</label>
              <span style={{ fontSize: "10px", color: "#047857", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
                <Lock sx={{ fontSize: 11 }} /> KYC Auto-Fetched
              </span>
            </div>
            <input
              className="sop-input"
              value={data.contactNumber || ""}
              readOnly
              placeholder="Auto-fetched from KYC..."
              style={{ fontWeight: 700, backgroundColor: "#f8fafc", color: "#1e293b", cursor: "not-allowed" }}
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">Department / Branch</label>
            <select
              className="sop-input"
              value={data.departmentLocation || ""}
              onChange={(e) => updateField("departmentLocation", e.target.value)}
              style={{ fontWeight: 700, height: "38px" }}
            >
              <option value="">-- SELECT DEPARTMENT / BRANCH --</option>
              {(compProfile.branches || []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {compProfile.branches && compProfile.branches.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                {compProfile.branches.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => updateField("departmentLocation", b)}
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "1px 6px",
                      borderRadius: "3px",
                      border: data.departmentLocation === b ? "1px solid #2563eb" : "1px solid #cbd5e1",
                      backgroundColor: data.departmentLocation === b ? "#eff6ff" : "#f8fafc",
                      color: data.departmentLocation === b ? "#1d4ed8" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delivery Location & Delivery Contact (Adjusted / Toggleable per Company) */}
        {(showDeliveryLocation || showDeliveryContact) && (
          <div className="sop-grid-2" style={{ marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
            {showDeliveryLocation && (
              <div className="sop-field-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label className="sop-field-label" style={{ fontWeight: 700, color: "#0369a1", margin: 0 }}>
                    📍 Delivery Location
                  </label>
                  <button
                    type="button"
                    onClick={applyCompanyDefaultLocation}
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 700,
                      color: "#0284c7",
                      background: "#e0f2fe",
                      border: "1px solid #bae6fd",
                      borderRadius: "4px",
                      padding: "1px 6px",
                      cursor: "pointer",
                    }}
                    title="Reset to selected company's facility address"
                  >
                    Auto-fill {compProfile.id} Location
                  </button>
                </div>
                <input
                  className="sop-input"
                  value={data.deliveryLocation || data.departmentLocation || ""}
                  onChange={(e) => updateField("deliveryLocation", e.target.value)}
                  placeholder="e.g. Purchase Dept / Site / Warehouse"
                  style={{ fontWeight: 600 }}
                />
              </div>
            )}
            {showDeliveryContact && (
              <div className="sop-field-group">
                <label className="sop-field-label" style={{ fontWeight: 700, color: "#0369a1" }}>
                  📞 Delivery Contact (Person & Phone)
                </label>
                <input
                  className="sop-input"
                  value={
                    data.deliveryContact ||
                    (data.deliveryContactPerson || data.deliveryContactNumber
                      ? [data.deliveryContactPerson, data.deliveryContactNumber].filter(Boolean).join(" | ")
                      : [data.preparedBy, data.contactNumber].filter(Boolean).join(" | "))
                  }
                  onChange={(e) => {
                    updateField("deliveryContact", e.target.value);
                    updateField("deliveryContactPerson", e.target.value);
                  }}
                  placeholder="e.g. AJAY | 9924301166"
                  style={{ fontWeight: 600 }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Middle Section: Items Required Table */}
      <div className="sop-card">
        <div className="sop-card-title">
          <span>B. Items Required</span>
          <button type="button" className="sop-btn primary" onClick={addItem}>
            <Add style={{ fontSize: "14px" }} /> Add Line
          </button>
        </div>
        <div className="sop-table-container">
          <datalist id="saved-procurement-products-list">
            {savedProducts.map((p, pIdx) => (
              <option key={pIdx} value={p.productName} />
            ))}
          </datalist>
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: "180px" }}>Product Name / Item</th>
                <th style={{ width: "180px" }}>Brand Preference</th>
                <th>Specification</th>
                <th style={{ width: "80px" }}>Qty</th>
                <th style={{ width: "115px" }}>Est. Price (₹)</th>
                <th style={{ width: "115px" }}>Est. Total (₹)</th>
                <th style={{ width: "40px", textAlign: "center" }}>Del</th>
              </tr>
            </thead>
            <tbody>
              {itemsRequired.map((item, idx) => {
                const total = (Number(item.qty) || 0) * (Number(item.estUnitCost) || 0);
                return (
                  <tr key={idx}>
                    <td>
                      <input
                        className="sop-input"
                        list="saved-procurement-products-list"
                        value={item.productName || item.tyreType || ""}
                        onChange={(e) => updateItem(idx, "productName", e.target.value)}
                        onBlur={() => saveProductDetails(itemsRequired[idx])}
                        placeholder="e.g. Paper, Ink, Tyre"
                      />
                    </td>
                    <td>
                      <input
                        className="sop-input"
                        value={item.brandPreference || ""}
                        onChange={(e) => updateItem(idx, "brandPreference", e.target.value)}
                        onBlur={() => saveProductDetails(itemsRequired[idx])}
                        placeholder="e.g. HP, JK Tyre, JK Paper"
                      />
                    </td>
                    <td>
                      <input
                        className="sop-input"
                        value={item.specification || item.sizeSpec || [item.loadRating, item.rimSize].filter(Boolean).join(" ") || ""}
                        onChange={(e) => updateItem(idx, "specification", e.target.value)}
                        onBlur={() => saveProductDetails(itemsRequired[idx])}
                        placeholder="e.g. 10.00R20 146/143K 20 / 75 GSM / A4"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="sop-input"
                        value={item.qty || ""}
                        onChange={(e) => updateItem(idx, "qty", e.target.value)}
                        style={{ textAlign: "right" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="sop-input"
                        value={item.estUnitCost || ""}
                        onChange={(e) => updateItem(idx, "estUnitCost", e.target.value)}
                        onBlur={() => saveProductDetails(itemsRequired[idx])}
                        style={{ textAlign: "right" }}
                      />
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#1e293b" }}>
                      {total.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}
                      >
                        <Delete style={{ fontSize: "15px" }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Compact Estimated Total Cost Strip */}
        <div className="sop-total-strip">
          <span>ESTIMATED TOTAL COST:</span>
          <span style={{ fontSize: "14px" }}>
            {totalCost.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
          </span>
        </div>
      </div>

      {/* Row: Specification & Stock Status (Adjusted / Toggleable per Company) */}
      {(showSectionC || showSectionD) && (
        <div className={showSectionC && showSectionD ? "sop-grid-2" : "sop-grid-1"}>
          {showSectionC && (
            <div className="sop-card">
              <div className="sop-card-title">C. Specification & Supplier Preference</div>
              <div className="sop-field-group">
                <label className="sop-field-label">Specification Details</label>
                <input
                  className="sop-input"
                  value={data.specificationDetails || ""}
                  onChange={(e) => updateField("specificationDetails", e.target.value)}
                  placeholder="Brand, Specification, Grade, Material / Model, etc."
                />
              </div>
              <div className="sop-grid-2">
                <div className="sop-field-group">
                  <label className="sop-field-label">Preferred Supplier (if any)</label>
                  <input
                    className="sop-input"
                    value={data.preferredSupplier || ""}
                    onChange={(e) => updateField("preferredSupplier", e.target.value)}
                    placeholder="e.g. Preferred Vendor"
                  />
                </div>
                <div className="sop-field-group">
                  <label className="sop-field-label">Supplier Contact</label>
                  <input
                    className="sop-input"
                    value={data.supplierContact || ""}
                    onChange={(e) => updateField("supplierContact", e.target.value)}
                    placeholder="Phone or Email"
                  />
                </div>
              </div>
            </div>
          )}

          {showSectionD && (
            <div className="sop-card">
              <div className="sop-card-title">D. Current Stock & Comments</div>
              <div className="sop-grid-2">
                <div className="sop-field-group">
                  <label className="sop-field-label">Current Stock – New</label>
                  <input
                    type="number"
                    className="sop-input"
                    value={data.currentStockNew || 0}
                    onChange={(e) => updateField("currentStockNew", e.target.value)}
                  />
                </div>
                <div className="sop-field-group">
                  <label className="sop-field-label">Current Stock – Used / Refurbished</label>
                  <input
                    type="number"
                    className="sop-input"
                    value={data.currentStockUsedRemould || 0}
                    onChange={(e) => updateField("currentStockUsedRemould", e.target.value)}
                  />
                </div>
              </div>
              <div className="sop-field-group">
                <label className="sop-field-label">Comments / Additional Information</label>
                <textarea
                  rows={2}
                  className="sop-textarea"
                  value={data.comments || ""}
                  onChange={(e) => updateField("comments", e.target.value)}
                  placeholder="Urgent purchase request remarks..."
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attachments & Additional Information for Purchase Team */}
      <div className="sop-card" style={{ borderLeft: "4px solid #2563eb" }}>
        <div className="sop-card-title">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📎 Attachments & Additional Information for Purchase Team</span>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "#1d4ed8",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "1px 8px",
                borderRadius: "10px",
              }}
            >
              Doc / Excel / PDF / JPEG
            </span>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="sop-btn primary"
              disabled={uploadingFiles}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {uploadingFiles ? <CircularProgress size={14} color="inherit" /> : <CloudUpload style={{ fontSize: "16px" }} />}
              <span>Upload Attachments ({attachments.length}/10)</span>
            </button>
          </div>
        </div>

        {/* Uploaded File Chips */}
        {attachments.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            {attachments.map((att, attIdx) => {
              const fullUrl = att.fileUrl?.startsWith("http")
                ? att.fileUrl
                : `${process.env.REACT_APP_API_STRING?.replace(/\/api$/, "") || ""}${att.fileUrl}`;
              return (
                <div
                  key={attIdx}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#1e293b",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <InsertDriveFile style={{ fontSize: "15px", color: "#2563eb" }} />
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#1d4ed8", textDecoration: "none", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={att.fileName}
                  >
                    {att.fileName}
                  </a>
                  <span style={{ fontSize: "10.5px", color: "#64748b" }}>({formatFileSize(att.fileSize)})</span>
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563eb", display: "inline-flex", alignItems: "center", marginLeft: "2px" }}
                    title="Open in new tab"
                  >
                    <OpenInNew style={{ fontSize: "13px" }} />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attIdx)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "2px",
                      marginLeft: "4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Remove file"
                  >
                    <Delete style={{ fontSize: "14px" }} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📎</span>
            <span>No files attached yet. Click <strong>Upload Attachments</strong> to attach quotation drafts, technical specs, or vendor references. (Max 10MB per file).</span>
          </div>
        )}

        {/* Additional Information for Purchase Team */}
        <div className="sop-field-group" style={{ marginBottom: 0 }}>
          <label className="sop-field-label" style={{ fontWeight: 700, color: "#1e3a8a" }}>
            Additional Information / Instructions for Purchase Team
          </label>
          <textarea
            rows={2}
            className="sop-textarea"
            value={data.additionalInformation || ""}
            onChange={(e) => {
              updateField("additionalInformation", e.target.value);
              if (onGlobalChange) onGlobalChange("additionalInformation", e.target.value.toUpperCase());
            }}
            placeholder="Special instructions, delivery timeline urgency, brand equivalents accepted, warranty requirements..."
          />
        </div>
      </div>

      {/* Bottom Section: Routing Checklist & Stage 1 Sign-Off */}
      <div className="sop-card">
        <div className="sop-card-title">
          <span>E. Routing Checklist & Stage 1 Sign-Off</span>
        </div>
        <div className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: "45px", textAlign: "center" }}>Check</th>
                <th style={{ width: "75px" }}>Step</th>
                <th>Action</th>
                <th style={{ width: "360px" }}>Checked By (Name & Designation Pair)</th>
                <th style={{ width: "110px" }}>Date</th>
                <th style={{ width: "80px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Step 1", "PR Raised by Requester"],
              ].map(([step, action], idx) => {
                const isDone = routingChecklist[idx]?.status === "Done";
                const dateVal = routingChecklist[idx]?.date ? routingChecklist[idx].date.split("T")[0] : "";
                const defaultHodName = compProfile.settings?.hodApproverName || "MOHIT SINGH";
                const defaultHodDesig = compProfile.settings?.hodApproverDesignation || "CEO";
                const responsibleVal = routingChecklist[idx]?.responsible || data.checkedBy || globalData?.checkedBy || defaultHodName;
                const designationVal = data.checkedByDesignation || globalData?.checkedByDesignation || data.hodValidation?.designation || defaultHodDesig;
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => handleChecklistToggle(idx, e.target.checked)}
                        style={{ cursor: "pointer", width: "15px", height: "15px" }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{step}</td>
                    <td>{action}</td>
                    <td style={{ padding: "6px" }}>
                      <ApproverPairSelector
                        compact={true}
                        name={responsibleVal}
                        designation={designationVal}
                        label="Checked By"
                        role="CHECKED_BY"
                        onPairChange={({ name: newName, designation: newDesig }) => {
                          const current = [...routingChecklist];
                          while (current.length <= idx) {
                            current.push({ step, action, responsible: newName });
                          }
                          current[idx] = { ...current[idx], responsible: newName };
                          onChange({
                            routingChecklist: current,
                            checkedBy: newName,
                            checkedByDesignation: newDesig,
                            hodValidation: {
                              ...(data.hodValidation || {}),
                              validatedBy: newName,
                              designation: newDesig,
                            },
                          });
                          if (onGlobalChange) {
                            onGlobalChange("checkedBy", newName);
                            onGlobalChange("checkedByDesignation", newDesig);
                          }
                        }}
                      />
                    </td>
                    <td>{dateVal || "-"}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "10px",
                          backgroundColor: isDone ? "#dcfce7" : "#f1f5f9",
                          color: isDone ? "#15803d" : "#64748b",
                        }}
                      >
                        {isDone ? "Done" : "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px", marginBottom: "14px" }}>
          * Checking <strong>Step 1</strong> locks requester identity and auto-generates official PR / PO sequence numbers. PR is routed to concerned HoD / Manager.
        </div>

        {/* ─── Approval Proof Upload (Email / WhatsApp Screenshot / Signed PDF) ─── */}
        <div
          style={{
            marginTop: "12px",
            padding: "14px",
            backgroundColor: "#f8fafc",
            border: "1px dashed #cbd5e1",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📎</span> Approval Proof (HoD / Manager Confirmation Screenshot or PDF)
              </span>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                Upload email screenshot, WhatsApp confirmation, or signed requisition proof. Visible to both Purchase and Finance teams.
              </span>
            </div>
            <div>
              <input
                type="file"
                id="approval-proof-input"
                style={{ display: "none" }}
                accept="image/*,.pdf"
                onChange={handleApprovalProofUpload}
              />
              <label htmlFor="approval-proof-input">
                <span
                  className="sop-btn sop-btn-secondary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: uploadingProof ? "not-allowed" : "pointer",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {uploadingProof ? <CircularProgress size={14} /> : <CloudUpload sx={{ fontSize: 16 }} />}
                  {data.approvalProof ? "Replace Proof" : "Upload Approval Proof"}
                </span>
              </label>
            </div>
          </div>

          {data.approvalProof && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                backgroundColor: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#065f46",
                marginTop: "6px",
              }}
            >
              <CheckCircle sx={{ fontSize: 16, color: "#059669" }} />
              <span>{data.approvalProof.fileName || "Approval_Proof"}</span>
              {data.approvalProof.fileUrl && (
                <a
                  href={data.approvalProof.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", textDecoration: "underline", marginLeft: "6px", display: "inline-flex", alignItems: "center", gap: "2px" }}
                >
                  View <OpenInNew sx={{ fontSize: 13 }} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Stage1PurchaseRequest);
