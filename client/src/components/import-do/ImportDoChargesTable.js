import React, { useState } from "react";
import {
    Checkbox,
    FormControlLabel,
    TextField,
    IconButton,
    Button,
    MenuItem,
    Select,
    Autocomplete,
    InputLabel,
    FormControl,
    Popover,
    Box,
    Typography,
    Radio,
    RadioGroup,
    FormLabel,
    Chip,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import ClearIcon from "@mui/icons-material/Clear";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";

const excelStyles = {
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: "12px",
        backgroundColor: "#fff",
        border: "1px solid #b2b2b2",
        boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
    },
    th: {
        backgroundColor: "#104e8b",
        backgroundImage: "linear-gradient(to bottom, #104e8b 0%, #0d3c6b 100%)",
        border: "1px solid #0d3c6b",
        padding: "10px 8px",
        textAlign: "center",
        fontWeight: "600",
        color: "#ffffff",
        verticalAlign: "middle",
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.3px",
    },
    td: {
        border: "1px solid #e0e0e0",
        padding: "0",
        verticalAlign: "middle",
        backgroundColor: "#fff",
    },
    inputWrapper: {
        width: "100%",
        height: "100%",
    },
    inputSx: {
        "& .MuiInputBase-root": {
            fontSize: "12px",
            fontFamily: "inherit",
            padding: "6px 10px",
        },
        "& .MuiInput-underline:before": { borderBottom: "none !important" },
        "& .MuiInput-underline:after": { borderBottom: "none !important" },
        "& .MuiSelect-select": { padding: "6px 10px", fontSize: "12px" }
    }
};

const chargeHeadOptions = [
    "EDI CHARGES",
    "ODEX INDIA SOLUTIONS PVT LTD",
    "HASTI PETRO CHEMICALS & SHIPPING LTD - IMPORT",
    "CONTAINER CORPN OF INDIA LTD.",
    "SR CONTAINER CARRIERS",
    "BOND PAPER EXP.",
    "THAR LOGISTICS",
    "CUSTOMS DUTY",
    "LABOUR & MISC CHARGES",
    "OTHER DOCUMENT"
];

const ImportDoChargesTable = ({
    formik,
    user,
    setFileSnackbar,
    allowPaymentMade = false,
    allowPaymentReceipt = false,
}) => {
    const [isTableEditable, setIsTableEditable] = useState(false);
    const [selectedDocumentType, setSelectedDocumentType] = useState("");
    const [paymentPopover, setPaymentPopover] = useState({ open: false, anchorEl: null, index: null, docType: null });

    const handleOpenPaymentDialog = (event, index, docType) => {
        setPaymentPopover({ open: true, anchorEl: event.currentTarget, index, docType });
    };

    const handleClosePaymentDialog = () => {
        setPaymentPopover({ ...paymentPopover, open: false, anchorEl: null });
    };

    const getCurrentISOString = () => new Date().toISOString();

    const handleDocumentCheckChange = (docIndex, docType) => (e) => {
        const isChecked = e.target.checked;
        const currentTime = isChecked ? getCurrentISOString() : "";

        formik.setFieldValue(
            `${docType}[${docIndex}].document_check_status`,
            isChecked
        );
        formik.setFieldValue(
            `${docType}[${docIndex}].document_check_date`,
            currentTime
        );
    };

    const handleDraftFinalChange = (docIndex, type, docType) => (e) => {
        if (type === "draft") {
            formik.setFieldValue(
                `${docType}[${docIndex}].is_draft`,
                true
            );
            formik.setFieldValue(
                `${docType}[${docIndex}].is_final`,
                false
            );
        } else {
            formik.setFieldValue(
                `${docType}[${docIndex}].is_draft`,
                false
            );
            formik.setFieldValue(
                `${docType}[${docIndex}].is_final`,
                true
            );
        }
    };

    const handleAddDocument = () => {
        if (!selectedDocumentType) return;

        const newDocument = {
            document_name: selectedDocumentType,
            url: [],
            document_check_date: "",
            document_amount_details: "",
            cost_rate: "",
        };

        if (selectedDocumentType !== "Security Deposit") {
            newDocument.is_draft = false;
            newDocument.is_final = false;
            newDocument.payment_mode = "";
            newDocument.wire_transfer_method = "";
            newDocument.payment_request_date = "";
            newDocument.payment_made_date = "";
            newDocument.is_tds = false;
            newDocument.is_non_tds = false;
        }

        if (selectedDocumentType === "Security Deposit") {
            newDocument.utr = "";
            newDocument.Validity_upto = "";
        }

        if (selectedDocumentType === "Shipping Line Invoice") {
            const currentDocs = [...formik.values.do_shipping_line_invoice];
            currentDocs.push(newDocument);
            formik.setFieldValue("do_shipping_line_invoice", currentDocs);
        } else if (selectedDocumentType === "Insurance") {
            const currentDocs = [...formik.values.insurance_copy];
            currentDocs.push(newDocument);
            formik.setFieldValue("insurance_copy", currentDocs);
        } else if (selectedDocumentType === "Security Deposit") {
            const currentDocs = [...formik.values.security_deposit];
            currentDocs.push(newDocument);
            formik.setFieldValue("security_deposit", currentDocs);
        } else {
            const currentDocs = [...formik.values.other_do_documents];
            currentDocs.push(newDocument);
            formik.setFieldValue("other_do_documents", currentDocs);
        }

        setSelectedDocumentType("");
        setIsTableEditable(true);
    };

    const handleDeleteFile = async (docType, docIndex, fileIndex) => {
        if (!window.confirm("Are you sure you want to delete this file?")) return;

        const currentDocs = [...formik.values[docType]];
        const fileUrl = currentDocs[docIndex].url[fileIndex];

        try {
            const key = new URL(fileUrl).pathname.slice(1);
            const response = await fetch(
                `${process.env.REACT_APP_API_STRING}/delete-s3-file`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key }),
                }
            );

            if (response.ok) {
                const updatedFiles = [...currentDocs[docIndex].url];
                updatedFiles.splice(fileIndex, 1);
                formik.setFieldValue(`${docType}[${docIndex}].url`, updatedFiles);
                setFileSnackbar(true);
            } else {
                alert("Failed to delete image from S3.");
            }
        } catch (error) {
            console.error("Error deleting image:", error);
            alert("Error deleting image.");
        }
    };

    const extractFileName = (url) => {
        try {
            if (!url) return "File";
            const parts = url.split("/");
            return decodeURIComponent(parts[parts.length - 1]);
        } catch (error) {
            return "File";
        }
    };

    const handleRemoveDocument = (docType, index) => {
        const currentDocs = [...formik.values[docType]];
        currentDocs.splice(index, 1);
        formik.setFieldValue(docType, currentDocs);
    };

    const renderDocumentTypeOptions = () => {
        return [
            <MenuItem key="Shipping Line Invoice" value="Shipping Line Invoice">SHIPPING LINE INVOICE</MenuItem>,
            <MenuItem key="Insurance" value="Insurance">INSURANCE</MenuItem>,
            <MenuItem key="Security Deposit" value="Security Deposit">SECURITY DEPOSIT</MenuItem>,
            ...chargeHeadOptions.map((option) => (
                <MenuItem key={option} value={option}>
                    {option}
                </MenuItem>
            )),
        ];
    };

    const renderChargesRow = (doc, index, docType, isRemovable) => {
        const isFullPaymentDoc = ["do_shipping_line_invoice", "insurance_copy", "other_do_documents"].includes(docType);
        const isSecurityDeposit = docType === "security_deposit";
        const bucketPath = docType;

        const cellInputProps = {
            disableUnderline: true,
            style: { fontSize: "13px" }
        };

        return (
            <tr key={`${docType}-${index}`} style={{ height: "auto", transition: "background-color 0.2s" }}>
                {/* CHARGE HEAD */}
                <td style={{ ...excelStyles.td, padding: "8px" }}>
                    <span style={{ fontWeight: 600, paddingLeft: "4px", fontSize: "12px", color: "#1a237e" }}>
                        {docType === "do_shipping_line_invoice" && formik.values.shipping_line_airline
                            ? formik.values.shipping_line_airline.toUpperCase()
                            : (doc.document_name || "").toUpperCase()}
                    </span>
                    {isRemovable && user?.role === "Admin" && isTableEditable && (
                        <div style={{ marginTop: 6 }}>
                            <Chip
                                label="Remove"
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() => handleRemoveDocument(docType, index)}
                                sx={{
                                    height: "20px",
                                    fontSize: "10px",
                                    cursor: "pointer",
                                    "&:hover": { backgroundColor: "#ffebee" }
                                }}
                            />
                        </div>
                    )}
                </td>

                {/* DOCUMENT / STATUS */}
                <td style={{ ...excelStyles.td, minWidth: "220px", padding: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {/* File Upload Section */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "space-between" }}>
                            <div style={{ flexGrow: 1, display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "center" }}>
                                {doc.url && doc.url.map((url, i) => (
                                    <Chip
                                        key={i}
                                        icon={<DescriptionIcon style={{ fontSize: "14px" }} />}
                                        label={extractFileName(url)}
                                        size="small"
                                        component="a"
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        clickable
                                        onDelete={isTableEditable ? () => handleDeleteFile(docType, index, i) : undefined}
                                        deleteIcon={<ClearIcon style={{ fontSize: "14px" }} />}
                                        sx={{
                                            maxWidth: "140px",
                                            fontSize: "10px",
                                            height: "22px",
                                            backgroundColor: "#e3f2fd",
                                            color: "#1565c0",
                                            "& .MuiChip-label": {
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap"
                                            },
                                            "&:hover": {
                                                backgroundColor: "#bbdefb"
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ flexShrink: 0 }}>
                                <FileUpload
                                    label={<CloudUploadIcon style={{ fontSize: "18px" }} />}
                                    bucketPath={bucketPath}
                                    onFilesUploaded={(newFiles) => {
                                        const existingFiles = doc.url || [];
                                        const updatedFiles = [...existingFiles, ...newFiles];
                                        formik.setFieldValue(`${docType}[${index}].url`, updatedFiles);
                                        setFileSnackbar(true);
                                    }}
                                    multiple={true}
                                    disabled={!isTableEditable}
                                    buttonSx={{
                                        minWidth: "28px",
                                        padding: "4px",
                                        height: "28px",
                                        borderRadius: "6px",
                                        backgroundColor: isTableEditable ? "#1976d2" : "#e0e0e0",
                                        color: "#fff",
                                        "&:hover": {
                                            backgroundColor: isTableEditable ? "#115293" : "#e0e0e0"
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Draft/Final Radio Buttons */}
                        {isFullPaymentDoc && (
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                padding: "6px 8px",
                                backgroundColor: "#f8f9fa",
                                borderRadius: "4px",
                                border: "1px solid #e9ecef"
                            }}>
                                <label style={{
                                    cursor: isTableEditable ? "pointer" : "default",
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontSize: "11px",
                                    fontWeight: doc.is_draft ? "600" : "400",
                                    color: doc.is_draft ? "#1976d2" : "#666"
                                }}>
                                    <input
                                        type="radio"
                                        checked={doc.is_draft}
                                        onChange={handleDraftFinalChange(index, "draft", docType)}
                                        disabled={!isTableEditable}
                                        style={{ marginRight: "4px", transform: "scale(0.9)" }}
                                    /> Draft
                                </label>
                                <label style={{
                                    cursor: isTableEditable ? "pointer" : "default",
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontSize: "11px",
                                    fontWeight: doc.is_final ? "600" : "400",
                                    color: doc.is_final ? "#2e7d32" : "#666"
                                }}>
                                    <input
                                        type="radio"
                                        checked={doc.is_final}
                                        onChange={handleDraftFinalChange(index, "final", docType)}
                                        disabled={!isTableEditable}
                                        style={{ marginRight: "4px", transform: "scale(0.9)" }}
                                    /> Final
                                </label>
                            </div>
                        )}
                    </div>
                </td>

                {/* COST RATE */}
                <td style={{ ...excelStyles.td, borderLeft: "3px solid #90caf9" }}>
                    <TextField
                        type="number"
                        value={doc.cost_rate || ""}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].cost_rate`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                        placeholder="0.00"
                        InputProps={cellInputProps}
                        sx={excelStyles.inputSx}
                    />
                </td>

                {/* AMOUNT */}
                <td style={excelStyles.td}>
                    <TextField
                        type="number"
                        value={doc.document_amount_details || ""}
                        onChange={(e) =>
                            formik.setFieldValue(
                                `${docType}[${index}].document_amount_details`,
                                e.target.value.replace(/[^0-9.]/g, "")
                            )
                        }
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                        placeholder="0.00"
                        InputProps={cellInputProps}
                        sx={excelStyles.inputSx}
                    />
                </td>

                {/* PAYMENT/DETAILS */}
                <td style={{ ...excelStyles.td, borderLeft: "3px solid #ffb74d", padding: "8px" }}>
                    <div
                        onClick={(e) => isTableEditable && handleOpenPaymentDialog(e, index, docType)}
                        style={{
                            width: "100%",
                            minHeight: "32px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: isTableEditable ? "pointer" : "default",
                            fontSize: "11px",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: isTableEditable ? "#fff3e0" : "#fafafa",
                            border: "1px dashed #ffb74d",
                            transition: "all 0.2s",
                            "&:hover": {
                                backgroundColor: isTableEditable ? "#ffe0b2" : "#fafafa"
                            }
                        }}
                    >
                        {(() => {
                            const parts = [];
                            const mode = doc.payment_mode;

                            if (mode) {
                                if (mode === "Wire Transfer" && doc.wire_transfer_method) {
                                    parts.push(`Wire (${doc.wire_transfer_method})`);
                                } else if (mode === "UTR" && (doc.utr_number || doc.utr)) {
                                    parts.push(`UTR: ${doc.utr_number || doc.utr}`);
                                } else if (mode === "Check" && doc.check_number) {
                                    parts.push(`Chk: ${doc.check_number}`);
                                } else {
                                    parts.push(mode);
                                }
                            }

                            if (doc.is_tds) parts.push("TDS");
                            else if (doc.is_non_tds) parts.push("Non-TDS");

                            if (isSecurityDeposit && doc.Validity_upto) {
                                parts.push(`Valid: ${new Date(doc.Validity_upto).toLocaleDateString()}`);
                            }

                            return parts.length > 0 ? (
                                <span style={{ color: "#e65100", fontWeight: 500 }}>{parts.join(", ")}</span>
                            ) : (
                                isTableEditable ? (
                                    <span style={{ color: "#1976d2", display: "flex", alignItems: "center", gap: "4px" }}>
                                        <EditIcon style={{ fontSize: "14px" }} />
                                        Click to Add Details
                                    </span>
                                ) : <span style={{ color: "#999" }}>—</span>
                            );
                        })()}
                    </div>
                </td>

                {/* STATUS */}
                <td style={excelStyles.td}>
                    {isFullPaymentDoc && (
                        <div style={{ padding: '8px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '6px',
                                padding: "4px 6px",
                                backgroundColor: doc.payment_request_date ? "#e8f5e9" : "#fafafa",
                                borderRadius: "4px",
                                border: doc.payment_request_date ? "1px solid #81c784" : "1px solid #e0e0e0"
                            }}>
                                <Checkbox
                                    checked={!!doc.payment_request_date}
                                    onChange={(e) => {
                                        const val = e.target.checked ? new Date().toISOString() : "";
                                        formik.setFieldValue(`${docType}[${index}].payment_request_date`, val);
                                    }}
                                    disabled={!isTableEditable}
                                    size="small"
                                    style={{ padding: '0 6px 0 0' }}
                                />
                                <div style={{ fontSize: '11px', flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: "#2e7d32" }}>Request</div>
                                    {doc.payment_request_date && (
                                        <div style={{ fontSize: "10px", color: "#666" }}>
                                            {new Date(doc.payment_request_date).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '6px',
                                padding: "4px 6px",
                                backgroundColor: doc.payment_made_date ? "#e3f2fd" : "#fafafa",
                                borderRadius: "4px",
                                border: doc.payment_made_date ? "1px solid #64b5f6" : "1px solid #e0e0e0"
                            }}>
                                <Checkbox
                                    checked={!!doc.payment_made_date}
                                    onChange={(e) => {
                                        const val = e.target.checked ? new Date().toISOString() : "";
                                        formik.setFieldValue(`${docType}[${index}].payment_made_date`, val);
                                    }}
                                    disabled={!allowPaymentMade}
                                    size="small"
                                    style={{ padding: '0 6px 0 0' }}
                                />
                                <div style={{ fontSize: '11px', flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: "#1565c0" }}>Made</div>
                                    {doc.payment_made_date && (
                                        <div style={{ fontSize: "10px", color: "#666" }}>
                                            {new Date(doc.payment_made_date).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(doc.payment_recipt?.length > 0 || (allowPaymentReceipt && doc.payment_made_date)) && (
                                <div style={{
                                    marginTop: 8,
                                    padding: "8px",
                                    backgroundColor: "#f3e5f5",
                                    borderRadius: "4px",
                                    border: "1px solid #ce93d8"
                                }}>
                                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#6a1b9a', marginBottom: 6 }}>
                                        Payment Receipt
                                    </div>

                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: allowPaymentReceipt ? "6px" : "0" }}>
                                        {doc.payment_recipt && doc.payment_recipt.map((url, i) => (
                                            <Chip
                                                key={i}
                                                label={extractFileName(url)}
                                                size="small"
                                                component="a"
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                clickable
                                                onDelete={allowPaymentReceipt ? () => {
                                                    const updatedFiles = [...(doc.payment_recipt || [])];
                                                    updatedFiles.splice(i, 1);
                                                    formik.setFieldValue(`${docType}[${index}].payment_recipt`, updatedFiles);
                                                    setFileSnackbar(true);
                                                } : undefined}
                                                deleteIcon={<ClearIcon style={{ fontSize: "12px" }} />}
                                                sx={{
                                                    maxWidth: "100px",
                                                    fontSize: "9px",
                                                    height: "20px",
                                                    backgroundColor: "#fff",
                                                    "& .MuiChip-label": {
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis"
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {allowPaymentReceipt && doc.payment_made_date && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: "6px" }}>
                                            <FileUpload
                                                label={<CloudUploadIcon style={{ fontSize: "14px" }} />}
                                                bucketPath="payment_receipts"
                                                onFilesUploaded={(newFiles) => {
                                                    const existingFiles = doc.payment_recipt || [];
                                                    const updatedFiles = [...existingFiles, ...newFiles];
                                                    formik.setFieldValue(`${docType}[${index}].payment_recipt`, updatedFiles);
                                                    formik.setFieldValue(`${docType}[${index}].payment_recipt_date`, new Date().toISOString());
                                                    setFileSnackbar(true);
                                                }}
                                                multiple={true}
                                                buttonSx={{
                                                    minWidth: "22px",
                                                    padding: "3px",
                                                    height: "22px",
                                                    borderRadius: "4px",
                                                    backgroundColor: "#6a1b9a",
                                                    color: "white",
                                                    "&:hover": { backgroundColor: "#4a148c" }
                                                }}
                                            />
                                            {(!doc.payment_recipt || doc.payment_recipt.length === 0) && (
                                                <Chip
                                                    label="Required"
                                                    size="small"
                                                    color="error"
                                                    sx={{ height: "18px", fontSize: "9px" }}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </td>

                {/* CHECKED */}
                <td style={{ ...excelStyles.td, textAlign: "center", minWidth: "70px", padding: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <Checkbox
                            checked={doc.document_check_status || false}
                            onChange={handleDocumentCheckChange(index, docType)}
                            disabled={true}
                            size="small"
                            color="success"
                        />
                        {doc.document_check_date && (
                            <div style={{
                                fontSize: '9px',
                                backgroundColor: "#e8f5e9",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                color: "#2e7d32",
                                fontWeight: 500
                            }}>
                                {new Date(doc.document_check_date).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="job-details-container">
            {/* Header Section */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                padding: "12px 16px",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                border: "1px solid #e0e0e0"
            }}>
                <JobDetailsRowHeading heading="Charges" />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={isTableEditable}
                            onChange={(e) => setIsTableEditable(e.target.checked)}
                            color="primary"
                        />
                    }
                    label={
                        <span style={{ fontWeight: 500, fontSize: "14px" }}>
                            {isTableEditable ? "🔓 Edit Mode" : "🔒 View Mode"}
                        </span>
                    }
                />
            </div>

            {/* Main Table */}
            <div style={{
                overflowX: "auto",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
                marginBottom: "20px"
            }}>
                <table style={excelStyles.table}>
                    <thead>
                        <tr>
                            <th rowSpan={2} width="20%" style={excelStyles.th}>Charge Head</th>
                            <th rowSpan={2} width="20%" style={excelStyles.th}>Document / Status</th>
                            <th colSpan={2} style={{ ...excelStyles.th, borderBottom: '3px solid #90caf9', borderLeft: "3px solid #90caf9", backgroundColor: "#1565c0" }}>
                                Cost
                            </th>
                            <th colSpan={3} style={{ ...excelStyles.th, borderBottom: '3px solid #ffb74d', borderLeft: "3px solid #ffb74d", backgroundColor: "#ef6c00" }}>
                                Operations
                            </th>
                        </tr>
                        <tr>
                            <th width="10%" style={{ ...excelStyles.th, borderLeft: "3px solid #90caf9" }}>Rate</th>
                            <th width="10%" style={excelStyles.th}>Amount</th>
                            <th width="15%" style={{ ...excelStyles.th, borderLeft: "3px solid #ffb74d" }}>Payment/Details</th>
                            <th width="10%" style={excelStyles.th}>Status</th>
                            <th width="8%" style={excelStyles.th}>Checked</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formik.values.do_shipping_line_invoice.map((doc, index) =>
                            renderChargesRow(doc, index, "do_shipping_line_invoice", index > 0)
                        )}
                        {formik.values.insurance_copy.map((doc, index) =>
                            renderChargesRow(doc, index, "insurance_copy", index > 0)
                        )}
                        {formik.values.security_deposit.map((doc, index) =>
                            renderChargesRow(doc, index, "security_deposit", index > 0)
                        )}
                        {formik.values.other_do_documents.map((doc, index) =>
                            renderChargesRow(doc, index, "other_do_documents", true)
                        )}
                    </tbody>
                </table>
            </div>



            {/* Add Document Section */}
            <div style={{
                marginTop: "24px",
                padding: "20px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "2px dashed #90caf9",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
            }}>
                <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AddCircleOutlineIcon style={{ color: "#1976d2", fontSize: "20px" }} />
                    <Typography variant="subtitle2" style={{ fontWeight: 600, color: "#1a237e" }}>
                        Add New Document
                    </Typography>
                </div>
                <Row>
                    <Col xs={12} md={7}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Select Document Type</InputLabel>
                            <Select
                                value={selectedDocumentType}
                                onChange={(e) => setSelectedDocumentType(e.target.value)}
                                label="Select Document Type"
                                sx={{ backgroundColor: "#fff" }}
                            >
                                {renderDocumentTypeOptions()}
                            </Select>
                        </FormControl>
                    </Col>
                    <Col xs={12} md={5}>
                        <Button
                            variant="contained"
                            onClick={handleAddDocument}
                            disabled={!selectedDocumentType}
                            startIcon={<AddCircleOutlineIcon />}
                            fullWidth
                            sx={{
                                height: "40px",
                                fontWeight: 600,
                                backgroundColor: selectedDocumentType ? "#1976d2" : "#e0e0e0",
                                "&:hover": {
                                    backgroundColor: selectedDocumentType ? "#115293" : "#e0e0e0"
                                }
                            }}
                        >
                            Add Document
                        </Button>
                    </Col>
                </Row>
            </div>

            {/* DO Copies Section */}
            <div style={{
                marginTop: "24px",
                padding: "20px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
            }}>
                <Typography variant="subtitle1" style={{
                    marginBottom: "12px",
                    fontWeight: 600,
                    color: "#1a237e",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                }}>
                    <DescriptionIcon style={{ fontSize: "20px" }} />
                    DO Copies
                </Typography>
                <div style={{ marginBottom: "12px" }}>
                    <FileUpload
                        label="Upload DO Copies"
                        bucketPath="do_copies"
                        onFilesUploaded={(newFiles) => {
                            const existingFiles = formik.values.do_copies || [];
                            const updatedFiles = [...existingFiles, ...newFiles];
                            formik.setFieldValue("do_copies", updatedFiles);
                            setFileSnackbar(true);
                        }}
                        multiple={true}
                        disabled={!isTableEditable}
                    />
                </div>
                <div style={{
                    padding: "12px",
                    backgroundColor: "#fafafa",
                    borderRadius: "6px",
                    minHeight: "60px"
                }}>
                    <ImagePreview
                        images={formik.values.do_copies || []}
                        onDeleteImage={isTableEditable ? (index) => {
                            const updatedFiles = [...formik.values.do_copies];
                            updatedFiles.splice(index, 1);
                            formik.setFieldValue("do_copies", updatedFiles);
                            setFileSnackbar(true);
                        } : undefined}
                    />
                </div>
            </div>

            {/* Payment Popover */}
            <Popover
                open={paymentPopover.open}
                anchorEl={paymentPopover.anchorEl}
                onClose={handleClosePaymentDialog}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    style: {
                        width: '360px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        border: '2px solid #104e8b'
                    }
                }}
            >
                <div style={{
                    background: "linear-gradient(135deg, #104e8b 0%, #0d3c6b 100%)",
                    color: "#fff",
                    padding: "14px 16px",
                    borderBottom: "1px solid #0d3c6b"
                }}>
                    <Typography variant="subtitle1" style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "0.3px" }}>
                        💳 Payment Details
                    </Typography>
                </div>
                <div style={{ padding: "20px" }}>
                    {paymentPopover.index !== null && paymentPopover.docType && formik.values[paymentPopover.docType] && formik.values[paymentPopover.docType][paymentPopover.index] && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

                            {/* Payment Mode */}
                            <FormControl component="fieldset" fullWidth>
                                <FormLabel component="legend" style={{
                                    fontSize: "12px",
                                    color: "#104e8b",
                                    fontWeight: "600",
                                    marginBottom: "8px"
                                }}>
                                    Payment Mode
                                </FormLabel>
                                <RadioGroup
                                    row
                                    value={formik.values[paymentPopover.docType][paymentPopover.index].payment_mode}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].payment_mode`, val);

                                        if (val !== "Wire Transfer") {
                                            formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].wire_transfer_method`, "");
                                        }
                                        if (val !== "UTR") {
                                            formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].utr_number`, "");
                                            if (paymentPopover.docType === "security_deposit") {
                                                formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].utr`, "");
                                            }
                                        }
                                        if (val !== "Check") {
                                            formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].check_number`, "");
                                            formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].check_date`, "");
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: "8px" }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: "8px" }}>
                                            <FormControlLabel
                                                value="Odex"
                                                control={<Radio size="small" sx={{ padding: "6px" }} />}
                                                label={<span style={{ fontSize: "13px" }}>Odex</span>}
                                            />
                                            <FormControlLabel
                                                value="Wire Transfer"
                                                control={<Radio size="small" sx={{ padding: "6px" }} />}
                                                label={<span style={{ fontSize: "13px" }}>Wire Transfer</span>}
                                            />
                                            <FormControlLabel
                                                value="UTR"
                                                control={<Radio size="small" sx={{ padding: "6px" }} />}
                                                label={<span style={{ fontSize: "13px" }}>UTR</span>}
                                            />
                                            <FormControlLabel
                                                value="Check"
                                                control={<Radio size="small" sx={{ padding: "6px" }} />}
                                                label={<span style={{ fontSize: "13px" }}>Check</span>}
                                            />
                                        </div>
                                    </div>
                                </RadioGroup>
                            </FormControl>

                            {/* Wire Transfer Methods */}
                            {formik.values[paymentPopover.docType][paymentPopover.index].payment_mode === "Wire Transfer" && (
                                <div style={{
                                    backgroundColor: "#e3f2fd",
                                    padding: "12px",
                                    borderRadius: "6px",
                                    marginTop: "-8px",
                                    border: "1px solid #90caf9"
                                }}>
                                    <FormLabel component="legend" style={{
                                        fontSize: "11px",
                                        color: "#1565c0",
                                        marginBottom: "6px",
                                        fontWeight: 600
                                    }}>
                                        Transfer Method
                                    </FormLabel>
                                    <RadioGroup
                                        row
                                        value={formik.values[paymentPopover.docType][paymentPopover.index].wire_transfer_method}
                                        onChange={(e) => formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].wire_transfer_method`, e.target.value)}
                                        sx={{ gap: "12px" }}
                                    >
                                        <FormControlLabel value="RTGS" control={<Radio size="small" />} label={<span style={{ fontSize: "12px" }}>RTGS</span>} />
                                        <FormControlLabel value="NEFT" control={<Radio size="small" />} label={<span style={{ fontSize: "12px" }}>NEFT</span>} />
                                        <FormControlLabel value="IMPS" control={<Radio size="small" />} label={<span style={{ fontSize: "12px" }}>IMPS</span>} />
                                    </RadioGroup>
                                </div>
                            )}

                            {/* UTR Details */}
                            {formik.values[paymentPopover.docType][paymentPopover.index].payment_mode === "UTR" && (
                                <div style={{
                                    backgroundColor: "#fff3e0",
                                    padding: "12px",
                                    borderRadius: "6px",
                                    marginTop: "-8px",
                                    border: "1px solid #ffb74d"
                                }}>
                                    <TextField
                                        label="UTR Number"
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        value={formik.values[paymentPopover.docType][paymentPopover.index].utr_number || formik.values[paymentPopover.docType][paymentPopover.index].utr || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].utr_number`, val);
                                            if (paymentPopover.docType === "security_deposit") {
                                                formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].utr`, val);
                                            }
                                        }}
                                        sx={{
                                            backgroundColor: "#fff",
                                            "& input": { fontSize: "13px", padding: "10px" }
                                        }}
                                        InputLabelProps={{ style: { fontSize: "12px" } }}
                                    />
                                </div>
                            )}

                            {/* Check Details */}
                            {formik.values[paymentPopover.docType][paymentPopover.index].payment_mode === "Check" && (
                                <div style={{
                                    backgroundColor: "#f3e5f5",
                                    padding: "12px",
                                    borderRadius: "6px",
                                    marginTop: "-8px",
                                    display: "flex",
                                    gap: "10px",
                                    flexDirection: "column",
                                    border: "1px solid #ce93d8"
                                }}>
                                    <TextField
                                        label="Check Details/Number"
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        value={formik.values[paymentPopover.docType][paymentPopover.index].check_number || ""}
                                        onChange={(e) => formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].check_number`, e.target.value)}
                                        sx={{
                                            backgroundColor: "#fff",
                                            "& input": { fontSize: "13px", padding: "10px" }
                                        }}
                                        InputLabelProps={{ style: { fontSize: "12px" } }}
                                    />
                                    <TextField
                                        type="date"
                                        label="Check Date"
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        value={formik.values[paymentPopover.docType][paymentPopover.index].check_date || ""}
                                        onChange={(e) => formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].check_date`, e.target.value)}
                                        InputLabelProps={{ shrink: true, style: { fontSize: "12px" } }}
                                        sx={{
                                            backgroundColor: "#fff",
                                            "& input": { fontSize: "13px", padding: "10px" }
                                        }}
                                    />
                                </div>
                            )}

                            {/* Tax Section */}
                            <FormControl component="fieldset" fullWidth>
                                <FormLabel component="legend" style={{
                                    fontSize: "12px",
                                    color: "#104e8b",
                                    fontWeight: "600",
                                    marginBottom: "8px"
                                }}>
                                    Tax Applicable
                                </FormLabel>
                                <RadioGroup
                                    row
                                    value={formik.values[paymentPopover.docType][paymentPopover.index].is_tds ? "TDS" : (formik.values[paymentPopover.docType][paymentPopover.index].is_non_tds ? "Non-TDS" : "")}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "TDS") {
                                            formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].is_tds`, true);
                                            formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].is_non_tds`, false);
                                        } else {
                                            formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].is_tds`, false);
                                            formik.setFieldValue(`${paymentPopover.docType}[${paymentPopover.index}].is_non_tds`, true);
                                        }
                                    }}
                                    sx={{ gap: "16px" }}
                                >
                                    <FormControlLabel
                                        value="TDS"
                                        control={<Radio size="small" sx={{ padding: "6px" }} />}
                                        label={<span style={{ fontSize: "13px" }}>TDS</span>}
                                    />
                                    <FormControlLabel
                                        value="Non-TDS"
                                        control={<Radio size="small" sx={{ padding: "6px" }} />}
                                        label={<span style={{ fontSize: "13px" }}>Non-TDS</span>}
                                    />
                                </RadioGroup>
                            </FormControl>

                            {/* Security Deposit Extra Field */}
                            {paymentPopover.docType === "security_deposit" && (
                                <TextField
                                    type="date"
                                    label="Validity Upto"
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    value={formik.values.security_deposit[paymentPopover.index].Validity_upto || ""}
                                    onChange={(e) => formik.setFieldValue(`security_deposit[${paymentPopover.index}].Validity_upto`, e.target.value)}
                                    InputLabelProps={{ shrink: true, style: { fontSize: "12px" } }}
                                    sx={{
                                        backgroundColor: "#fff",
                                        "& input": { fontSize: "13px", padding: "10px" }
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
                <div style={{
                    padding: "12px 16px",
                    borderTop: "1px solid #e0e0e0",
                    display: "flex",
                    justifyContent: "flex-end",
                    backgroundColor: "#fafafa"
                }}>
                    <Button
                        onClick={handleClosePaymentDialog}
                        variant="contained"
                        size="small"
                        sx={{
                            backgroundColor: "#104e8b",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "12px",
                            "&:hover": {
                                backgroundColor: "#0d3c6b"
                            }
                        }}
                    >
                        Done
                    </Button>
                </div>
            </Popover>
        </div>
    );
};

export default ImportDoChargesTable;