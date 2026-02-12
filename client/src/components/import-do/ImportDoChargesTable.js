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
    FormControl,
    InputLabel,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";

const chargeHeadOptions = [
    "EDI CHARGES",
    "ODEX INDIA SOLUTIONS PVT LTD",
    "HASTI PETRO CHEMICALS & SHIPPING LTD",
    "CONTAINER CORPN OF INDIA LTD",
    "SR CONTAINER CARRIERS",
    "BOND PAPER EXP.",
    "THAR LOGISTICS",
    "CUSTOMS DUTY"
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

    const handleDraftFinalChange = (docIndex, type) => (e) => {
        if (type === "draft") {
            formik.setFieldValue(
                `do_shipping_line_invoice[${docIndex}].is_draft`,
                true
            );
            formik.setFieldValue(
                `do_shipping_line_invoice[${docIndex}].is_final`,
                false
            );
        } else {
            formik.setFieldValue(
                `do_shipping_line_invoice[${docIndex}].is_draft`,
                false
            );
            formik.setFieldValue(
                `do_shipping_line_invoice[${docIndex}].is_final`,
                true
            );
        }
    };

    const handlePaymentModeChange = (docIndex, mode) => (e) => {
        formik.setFieldValue(
            `do_shipping_line_invoice[${docIndex}].payment_mode`,
            mode
        );
        if (mode !== "Wire Transfer") {
            formik.setFieldValue(
                `do_shipping_line_invoice[${docIndex}].wire_transfer_method`,
                ""
            );
        }
    };

    const handleAddDocument = () => {
        if (!selectedDocumentType) return;

        const newDocument = {
            document_name:
                selectedDocumentType === "other" || selectedDocumentType === "new_charge" ? "" : selectedDocumentType,
            url: [],
            document_check_date: "",
            document_amount_details: "",
            currency: "INR",
            charge_basis: "",
            charge_rate: "",
            exchange_rate: "1",
            amount_inr: "",
            receivable: "",
            cost_rate: "",
            cost_amount: "",
            cost_amount_inr: "",
            payable: "",
        };

        if (selectedDocumentType === "Shipping Line Invoice") {
            newDocument.is_draft = false;
            newDocument.is_final = false;
            newDocument.payment_mode = "";
            newDocument.wire_transfer_method = "";
            newDocument.payment_request_date = "";
            newDocument.payment_made_date = "";
            newDocument.is_tds = false;
            newDocument.is_non_tds = false;
        } else if (selectedDocumentType === "Security Deposit") {
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

    const handleRemoveDocument = (docType, index) => {
        const currentDocs = [...formik.values[docType]];
        currentDocs.splice(index, 1);
        formik.setFieldValue(docType, currentDocs);
    };

    const renderChargesRow = (doc, index, docType, isRemovable) => {
        const isShippingInvoice = docType === "do_shipping_line_invoice";
        const isSecurityDeposit = docType === "security_deposit";
        const bucketPath = docType;

        return (
            <tr key={`${docType}-${index}`} style={{ verticalAlign: "top" }}>
                <td>
                    {docType === "other_do_documents" ? (
                        <Autocomplete
                            freeSolo
                            options={chargeHeadOptions}
                            value={doc.document_name || ""}
                            disabled={!isTableEditable}
                            onInputChange={(event, newValue) => {
                                formik.setFieldValue(`${docType}[${index}].document_name`, newValue);
                            }}
                            onChange={(event, newValue) => {
                                formik.setFieldValue(`${docType}[${index}].document_name`, newValue);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    fullWidth
                                    size="small"
                                    variant="standard"
                                    placeholder="Document Name"
                                />
                            )}
                        />
                    ) : (
                        <span style={{ fontWeight: 600 }}>{doc.document_name}</span>
                    )}
                    {isRemovable && user?.role === "Admin" && isTableEditable && (
                        <div style={{ marginTop: 5 }}>
                            <Button
                                color="error"
                                size="small"
                                onClick={() => handleRemoveDocument(docType, index)}
                            >
                                Remove
                            </Button>
                        </div>
                    )}
                </td>

                <td style={{ minWidth: "200px" }}>
                    <div style={{ marginBottom: 5 }}>
                        <FileUpload
                            label="Upload"
                            bucketPath={bucketPath}
                            onFilesUploaded={(newFiles) => {
                                const existingFiles = doc.url || [];
                                const updatedFiles = [...existingFiles, ...newFiles];
                                formik.setFieldValue(`${docType}[${index}].url`, updatedFiles);
                                setFileSnackbar(true);
                            }}
                            multiple={true}
                            disabled={!isTableEditable}
                        />
                        <div style={{ marginTop: 5 }}>
                            <ImagePreview
                                images={doc.url || []}
                                onDeleteImage={isTableEditable ? (imgIndex) => {
                                    const updatedFiles = [...doc.url];
                                    updatedFiles.splice(imgIndex, 1);
                                    formik.setFieldValue(`${docType}[${index}].url`, updatedFiles);
                                    setFileSnackbar(true);
                                } : undefined}
                            />
                        </div>
                    </div>
                    {isShippingInvoice && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <label>
                                <input
                                    type="radio"
                                    checked={doc.is_draft}
                                    onChange={handleDraftFinalChange(index, "draft")}
                                    disabled={!isTableEditable}
                                /> Draft
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    checked={doc.is_final}
                                    onChange={handleDraftFinalChange(index, "final")}
                                    disabled={!isTableEditable}
                                /> Final
                            </label>
                        </div>
                    )}
                </td>

                <td style={{ minWidth: "70px" }}>
                    <Select
                        value={doc.currency || "INR"}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].currency`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                    >
                        <MenuItem value="INR">INR</MenuItem>
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                    </Select>
                </td>

                <td style={{ minWidth: "150px" }}>
                    <Select
                        value={doc.charge_basis || ""}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].charge_basis`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Select Basis</MenuItem>
                        <MenuItem value="Per Package">Per Package</MenuItem>
                        <MenuItem value="By Gross Wt">By Gross Wt</MenuItem>
                        <MenuItem value="By Chg Wt">By Chg Wt</MenuItem>
                        <MenuItem value="By Volume">By Volume</MenuItem>
                        <MenuItem value="Per Container">Per Container</MenuItem>
                        <MenuItem value="Per TEU">Per TEU</MenuItem>
                        <MenuItem value="Per FEU">Per FEU</MenuItem>
                        <MenuItem value="% of Other Charges">% of Other Charges</MenuItem>
                        <MenuItem value="% of Assessable Value">% of Assessable Value</MenuItem>
                        <MenuItem value="% of AV+Duty">% of AV+Duty</MenuItem>
                        <MenuItem value="% of CIF Value">% of CIF Value</MenuItem>
                        <MenuItem value="Per Vehicle">Per Vehicle</MenuItem>
                        <MenuItem value="% of Invoice Value">% of Invoice Value</MenuItem>
                        <MenuItem value="Per License">Per License</MenuItem>
                        <MenuItem value="Per B/E - Per Shp">Per B/E - Per Shp</MenuItem>
                        <MenuItem value="% of Product Value">% of Product Value</MenuItem>
                        <MenuItem value="Per Labour">Per Labour</MenuItem>
                        <MenuItem value="Per Product">Per Product</MenuItem>
                        <MenuItem value="By Net Wt">By Net Wt</MenuItem>
                        <MenuItem value="Per Invoice">Per Invoice</MenuItem>
                    </Select>
                </td>

                <td>
                    <TextField
                        type="number"
                        value={doc.charge_rate || ""}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].charge_rate`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                        placeholder="Rate"
                    />
                </td>

                <td>
                    <TextField
                        type="number"
                        value={doc.document_amount_details}
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
                        placeholder="Amount"
                    />
                </td>

                <td>
                    <TextField
                        type="number"
                        value={doc.exchange_rate || 1}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].exchange_rate`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                    />
                </td>

                <td>
                    <TextField
                        type="number"
                        value={doc.amount_inr || (doc.document_amount_details ? (doc.document_amount_details * (doc.exchange_rate || 1)).toFixed(2) : "")}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].amount_inr`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                        placeholder="INR"
                    />
                </td>

                <td>
                    <TextField
                        value={doc.receivable || ""}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].receivable`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                        placeholder="Receivable"
                    />
                </td>

                <td style={{ borderLeft: "2px solid #ddd" }}>
                    <TextField
                        type="number"
                        value={doc.cost_rate || ""}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].cost_rate`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                        placeholder="Rate"
                    />
                </td>

                <td>
                    <TextField
                        type="number"
                        value={doc.cost_amount || ""}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].cost_amount`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                        placeholder="Amount"
                    />
                </td>

                <td>
                    <TextField
                        type="number"
                        value={doc.cost_amount_inr || ""}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].cost_amount_inr`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                        placeholder="INR"
                    />
                </td>

                <td>
                    <TextField
                        value={doc.payable || ""}
                        onChange={(e) => formik.setFieldValue(`${docType}[${index}].payable`, e.target.value)}
                        disabled={!isTableEditable}
                        variant="standard"
                        fullWidth
                        size="small"
                        placeholder="Payable"
                    />
                </td>

                <td style={{ borderLeft: "2px solid #ddd" }}>
                    {isShippingInvoice && (
                        <div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <label><input type="radio" checked={doc.payment_mode === "Odex"} onChange={handlePaymentModeChange(index, "Odex")} disabled={!isTableEditable} /> Odex</label>
                                <label><input type="radio" checked={doc.payment_mode === "Wire Transfer"} onChange={handlePaymentModeChange(index, "Wire Transfer")} disabled={!isTableEditable} /> Wire</label>
                            </div>
                            {doc.payment_mode === "Wire Transfer" && (
                                <div style={{ marginLeft: 10, fontSize: '0.85em', marginTop: 5 }}>
                                    {["RTGS", "NEFT", "IMPS"].map(m => (
                                        <label key={m} style={{ marginRight: 8 }}>
                                            <input type="radio" checked={doc.wire_transfer_method === m} onChange={() => formik.setFieldValue(`do_shipping_line_invoice[${index}].wire_transfer_method`, m)} disabled={!isTableEditable} /> {m}
                                        </label>
                                    ))}
                                </div>
                            )}
                            <div style={{ marginTop: 5, borderTop: '1px solid #eee', paddingTop: 5 }}>
                                <label style={{ marginRight: 10 }}><input type="radio" checked={doc.is_tds} onChange={() => { formik.setFieldValue(`${docType}[${index}].is_tds`, true); formik.setFieldValue(`${docType}[${index}].is_non_tds`, false); }} disabled={!isTableEditable} /> TDS</label>
                                <label><input type="radio" checked={doc.is_non_tds} onChange={() => { formik.setFieldValue(`${docType}[${index}].is_tds`, false); formik.setFieldValue(`${docType}[${index}].is_non_tds`, true); }} disabled={!isTableEditable} /> Non-TDS</label>
                            </div>
                        </div>
                    )}
                    {isSecurityDeposit && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <TextField label="UTR" size="small" variant="standard" value={doc.utr} onChange={(e) => formik.setFieldValue(`${docType}[${index}].utr`, e.target.value.replace(/[^0-9]/g, ""))} disabled={!isTableEditable} />
                            <TextField label="Validity" type="date" size="small" variant="standard" value={doc.Validity_upto} onChange={(e) => formik.setFieldValue(`${docType}[${index}].Validity_upto`, e.target.value)} InputLabelProps={{ shrink: true }} disabled={!isTableEditable} />
                        </div>
                    )}
                </td>

                <td>
                    {isShippingInvoice && (
                        <div>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={!!doc.payment_request_date}
                                        onChange={(e) => {
                                            const val = e.target.checked ? new Date().toISOString() : "";
                                            formik.setFieldValue(`${docType}[${index}].payment_request_date`, val);
                                        }}
                                        disabled={!isTableEditable}
                                        size="small"
                                    />
                                }
                                label={<span style={{ fontSize: '0.8em' }}>Req: {doc.payment_request_date ? new Date(doc.payment_request_date).toLocaleDateString() : ""}</span>}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={!!doc.payment_made_date}
                                        onChange={(e) => {
                                            const val = e.target.checked ? new Date().toISOString() : "";
                                            formik.setFieldValue(`${docType}[${index}].payment_made_date`, val);
                                        }}
                                        disabled={!allowPaymentMade}
                                        size="small"
                                    />
                                }
                                label={<span style={{ fontSize: '0.8em' }}>Made: {doc.payment_made_date ? new Date(doc.payment_made_date).toLocaleDateString() : ""}</span>}
                            />
                            {allowPaymentReceipt && doc.payment_made_date && (
                                <div style={{ marginTop: 10, borderTop: '1px solid #eee', paddingTop: 10 }}>
                                    <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#1976d2', marginBottom: 5 }}>Payment Receipt</div>
                                    <FileUpload
                                        label="Upload Receipt"
                                        bucketPath="payment_receipts"
                                        onFilesUploaded={(newFiles) => {
                                            const existingFiles = doc.payment_recipt || [];
                                            const updatedFiles = [...existingFiles, ...newFiles];
                                            formik.setFieldValue(`${docType}[${index}].payment_recipt`, updatedFiles);
                                            formik.setFieldValue(`${docType}[${index}].payment_recipt_date`, new Date().toISOString());
                                            setFileSnackbar(true);
                                        }}
                                        multiple={true}
                                    />
                                    <ImagePreview
                                        images={doc.payment_recipt || []}
                                        onDeleteImage={(imgIndex) => {
                                            const updatedFiles = [...(doc.payment_recipt || [])];
                                            updatedFiles.splice(imgIndex, 1);
                                            formik.setFieldValue(`${docType}[${index}].payment_recipt`, updatedFiles);
                                            setFileSnackbar(true);
                                        }}
                                    />
                                    {(!doc.payment_recipt || doc.payment_recipt.length === 0) && (
                                        <div style={{ color: "red", fontSize: "0.75rem" }}>* Receipt required</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </td>

                <td>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={doc.document_check_status || false}
                                onChange={handleDocumentCheckChange(index, docType)}
                                disabled={true}
                                size="small"
                            />
                        }
                        label={<span style={{ fontSize: '0.8em' }}>Checked</span>}
                    />
                    {doc.document_check_date && <div style={{ fontSize: '0.75em', marginTop: -5 }}>{new Date(doc.document_check_date).toLocaleDateString()}</div>}
                </td>
            </tr>
        );
    };

    return (
        <div className="job-details-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <JobDetailsRowHeading heading="Charges" />
                <FormControlLabel
                    control={<Checkbox checked={isTableEditable} onChange={(e) => setIsTableEditable(e.target.checked)} color="primary" />}
                    label="Enable Edit"
                />
            </div>

            <div style={{ overflowX: "auto" }}>
                <table className="table table-bordered table-hover" style={{ fontSize: "14px", backgroundColor: "#fff" }}>
                    <thead style={{ backgroundColor: "#f5f5f5" }}>
                        <tr>
                            <th rowSpan={2} width="15%" style={{ verticalAlign: 'middle' }}>Charge Head</th>
                            <th rowSpan={2} width="15%" style={{ verticalAlign: 'middle' }}>Document / Status</th>
                            <th rowSpan={2} width="5%" style={{ verticalAlign: 'middle' }}>Curr</th>
                            <th colSpan={6} style={{ textAlign: "center", borderBottom: '2px solid #ddd' }}>Revenue</th>
                            <th colSpan={4} style={{ textAlign: "center", borderBottom: '2px solid #ddd', borderLeft: "2px solid #ddd" }}>Cost</th>
                            <th colSpan={3} style={{ textAlign: "center", borderBottom: '2px solid #ddd', borderLeft: "2px solid #ddd" }}>Operations</th>
                        </tr>
                        <tr>
                            <th width="8%">Basis</th>
                            <th width="8%">Rate</th>
                            <th width="8%">Amount</th>
                            <th width="5%">Ex.Rate</th>
                            <th width="8%">Amt (INR)</th>
                            <th width="10%">Receivable</th>
                            <th width="8%" style={{ borderLeft: "2px solid #ddd" }}>Rate</th>
                            <th width="8%">Amount</th>
                            <th width="8%">Amt (INR)</th>
                            <th width="10%">Payable</th>
                            <th width="15%" style={{ borderLeft: "2px solid #ddd" }}>Payment/Details</th>
                            <th width="10%">Status</th>
                            <th width="8%">Checked</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formik.values.do_shipping_line_invoice.map((doc, index) => renderChargesRow(doc, index, "do_shipping_line_invoice", index > 0))}
                        {formik.values.insurance_copy.map((doc, index) => renderChargesRow(doc, index, "insurance_copy", index > 0))}
                        {formik.values.security_deposit.map((doc, index) => renderChargesRow(doc, index, "security_deposit", index > 0))}
                        {formik.values.other_do_documents.map((doc, index) => renderChargesRow(doc, index, "other_do_documents", true))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px" }}>
                <h6 style={{ marginBottom: "8px", fontWeight: 600, color: "#1a237e" }}>DO Copies</h6>
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
                <div style={{ marginTop: "10px" }}>
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

            <div style={{ marginTop: "20px", padding: "15px", border: "2px dashed #ccc", borderRadius: "5px" }}>
                <Row>
                    <Col xs={12} md={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Select Document Type</InputLabel>
                            <Select
                                value={selectedDocumentType}
                                onChange={(e) => setSelectedDocumentType(e.target.value)}
                                label="Select Document Type"
                            >
                                <MenuItem value="Shipping Line Invoice">Shipping Line Invoice</MenuItem>
                                <MenuItem value="Insurance">Insurance Copy</MenuItem>
                                <MenuItem value="Security Deposit">Security Deposit</MenuItem>
                                <MenuItem value="other">Other Document</MenuItem>
                                <MenuItem value="new_charge">New Charge Head</MenuItem>
                            </Select>
                        </FormControl>
                    </Col>
                    <Col xs={12} md={6}>
                        <Button
                            variant="contained"
                            onClick={handleAddDocument}
                            disabled={!selectedDocumentType}
                            style={{ marginTop: "8px" }}
                        >
                            Add Document
                        </Button>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default ImportDoChargesTable;
