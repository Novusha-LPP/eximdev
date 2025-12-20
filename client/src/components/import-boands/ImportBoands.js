import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Typography,
    Autocomplete,
    TextField,
    Button,
    Paper,
    Divider,
    CircularProgress,
    IconButton,
    Tooltip,
    Grid,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import PrintIcon from "@mui/icons-material/Print";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";

// Sophisticated "Old Money" palette
const enterpriseTheme = {
    primary: "#1a237e", // Deep Naval Blue
    secondary: "#455a64", // Slate Gray
    accent: "#bcaaa4", // Subtle Brass/Tan
    background: "#fcfaf5", // Creamy Paper
    border: "#d1d1d1",
    text: "#2c2c2c",
};

const quillStyles = {
    ".ql-editor": {
        minHeight: "750px",
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: "11pt",
        lineHeight: "1.3",
        backgroundColor: "#fff",
        color: enterpriseTheme.text,
        padding: "30px 40px",
        boxShadow: "inset 0 0 5px rgba(0,0,0,0.02)",
    },
    ".ql-toolbar": {
        backgroundColor: "#f1f1f1",
        borderTopLeftRadius: "2px",
        borderTopRightRadius: "2px",
        borderColor: enterpriseTheme.border,
        borderBottom: "1px solid " + enterpriseTheme.border,
        padding: "4px !important",
    },
    ".ql-container": {
        borderRadius: "0",
        borderColor: enterpriseTheme.border,
        backgroundColor: "#fff",
    }
};

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['clean']
    ],
};

function ImportBoands() {
    const [shippingLines, setShippingLines] = useState([]);
    const [importers, setImporters] = useState([]);
    const [selectedShippingLine, setSelectedShippingLine] = useState(null);
    const [selectedImporter, setSelectedImporter] = useState(null);
    const [importerDetails, setImporterDetails] = useState(null);
    const [bondContent, setBondContent] = useState("");
    const [validityDate, setValidityDate] = useState("");
    const [fileUrl, setFileUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetchingFormat, setFetchingFormat] = useState(false);
    const [fetchingRecord, setFetchingRecord] = useState(false);
    const printRef = useRef();
    const quillRef = useRef(null);
    const [selectedYear, setSelectedYear] = useState("");
    const years = ["24-25", "25-26", "26-27"];

    // Initialize default year
    useEffect(() => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentTwoDigits = String(currentYear).slice(-2);
        const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");
        const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");

        let defaultYearPair;
        if (currentMonth >= 4) {
            defaultYearPair = `${currentTwoDigits}-${nextTwoDigits}`;
        } else {
            defaultYearPair = `${prevTwoDigits}-${currentTwoDigits}`;
        }

        if (!selectedYear) {
            if (years.includes(defaultYearPair)) {
                setSelectedYear(defaultYearPair);
            } else {
                setSelectedYear(years[0]);
            }
        }
    }, [selectedYear]);

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedYear) return;
            try {
                setLoading(true);
                const [slRes, impRes] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_STRING}/get-unique-shipping-lines`),
                    axios.get(`${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYear}`),
                ]);
                setShippingLines(slRes.data.map((item) => item.shipping_line_airline));

                // Extract unique importer names
                const impData = impRes.data || [];
                const uniqueNames = [...new Set(impData.map(it => it.importer))].sort();
                setImporters(uniqueNames);
            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast.error("Failed to load shipping lines or importers.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedYear]);

    useEffect(() => {
        const fetchFormat = async () => {
            if (selectedShippingLine) {
                try {
                    setFetchingFormat(true);
                    const res = await axios.get(
                        `${process.env.REACT_APP_API_STRING}/bond-format/${encodeURIComponent(
                            selectedShippingLine
                        )}`
                    );
                    setBondContent(res.data.content || "");
                } catch (error) {
                    console.error("Error fetching bond format:", error);
                    toast.error("Failed to load bond format.");
                } finally {
                    setFetchingFormat(false);
                }
            } else {
                setBondContent("");
            }
        };
        fetchFormat();
    }, [selectedShippingLine]);

    useEffect(() => {
        const fetchRecord = async () => {
            if (selectedShippingLine && selectedImporter) {
                try {
                    setFetchingRecord(true);
                    const [bondRes, detailsRes] = await Promise.all([
                        axios.get(`${process.env.REACT_APP_API_STRING}/importer-bond/${encodeURIComponent(selectedShippingLine)}/${encodeURIComponent(selectedImporter)}`),
                        axios.get(`${process.env.REACT_APP_API_STRING}/get-importer-details/${encodeURIComponent(selectedImporter)}`)
                    ]);
                    setFileUrl(bondRes.data.fileUrl || "");
                    setValidityDate(bondRes.data.validityDate || "");
                    setImporterDetails(detailsRes.data);
                } catch (error) {
                    console.error("Error fetching importer data:", error);
                } finally {
                    setFetchingRecord(false);
                }
            } else {
                setFileUrl("");
                setValidityDate("");
                setImporterDetails(null);
            }
        };
        fetchRecord();
    }, [selectedShippingLine, selectedImporter]);

    const insertVariable = (value) => {
        if (!quillRef.current || !value) return;

        // Clean values: Replace all types of newlines/tabs/multiple spaces with a single space
        const cleanValue = value.toString().replace(/[\r\n\t]+/g, " ").replace(/\s\s+/g, " ").trim();

        const editor = quillRef.current.getEditor();
        const range = editor.getSelection();
        if (range) {
            editor.insertText(range.index, cleanValue);
            editor.setSelection(range.index + cleanValue.length);
        } else {
            editor.insertText(editor.getLength(), cleanValue);
        }
    };

    const handleSave = async () => {
        if (!selectedShippingLine || !selectedImporter) {
            toast.warning("Please select a shipping line and importer first.");
            return;
        }
        try {
            setLoading(true);
            // Save shared template
            await axios.post(`${process.env.REACT_APP_API_STRING}/bond-format`, {
                shippingLine: selectedShippingLine,
                content: bondContent,
            });
            // Save importer-specific record
            await axios.post(`${process.env.REACT_APP_API_STRING}/importer-bond`, {
                shippingLine: selectedShippingLine,
                importer: selectedImporter,
                fileUrl,
                validityDate,
            });
            toast.success("Bond saved successfully!");
        } catch (error) {
            console.error("Error saving bond:", error);
            toast.error("Failed to save bond.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        if (!bondContent.trim()) {
            toast.warning("Nothing to print!");
            return;
        }

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
      <html>
        <head>
          <title>Print Bond - ${selectedShippingLine || ""}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            body { 
              font-family: 'Times New Roman', Times, serif; 
              padding: 0; 
              margin: 0;
              background-color: white;
              -webkit-print-color-adjust: exact;
            }
            .print-container {
              width: 100%;
              box-sizing: border-box;
            }
            .ql-editor {
              padding: 0 !important;
              font-size: 12pt;
              line-height: 1.35;
              overflow: visible;
              color: black !important;
              background-color: transparent !important;
            }
            .ql-editor p {
              margin: 0 0 4pt 0 !important;
            }
            @page {
              margin: 0mm;
              size: A4;
            }
            @media print {
              .no-print { display: none; }
              body { 
                margin: 0; 
                padding: 0; 
              }
            }
            /* Preserve alignments from Quill */
            .ql-align-center { text-align: center; }
            .ql-align-right { text-align: right; }
            .ql-align-justify { text-align: justify; }
          </style>
        </head>
        <body>
          <div class="print-container ql-snow">
            <div class="ql-editor">
                ${bondContent}
            </div>
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };


    if (loading && shippingLines.length === 0) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <React.Fragment>
            <style>
                {`
                .quill-wrapper .ql-editor {
                    min-height: 700px;
                    font-family: 'Times New Roman', Times, serif;
                    font-size: 11pt;
                    line-height: 1.3;
                    background-color: #fff;
                    color: ${enterpriseTheme.text};
                    padding: 30px 40px;
                }
                .quill-wrapper .ql-editor p {
                    margin-bottom: 4pt;
                }
                .quill-wrapper .ql-toolbar {
                    background-color: #f1f1f1;
                    border-color: ${enterpriseTheme.border};
                    padding: 3px !important;
                }
                .quill-wrapper .ql-container {
                    border-color: ${enterpriseTheme.border};
                }
                .enterprise-card {
                    background: #fff;
                    border: 1px solid ${enterpriseTheme.border};
                    border-radius: 2px;
                }
                .variable-chip {
                    background: #fff;
                    border: 1px solid ${enterpriseTheme.border};
                    color: #444;
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 0;
                    text-transform: uppercase;
                    transition: all 0.1s;
                }
                .variable-chip:hover {
                    background: ${enterpriseTheme.primary};
                    color: #fff;
                    cursor: pointer;
                }
                .compact-label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: ${enterpriseTheme.secondary};
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                `}
            </style>
            <Box sx={{ p: 1, bgcolor: "#f1f1f1", minHeight: "100vh" }}>
                <ToastContainer position="top-right" autoClose={2000} />

                <Paper elevation={0} className="enterprise-card" sx={{ p: 1.5, maxWidth: "1400px", mx: "auto" }}>
                    {/* Compact Header Row */}
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 1 }}>
                        <Typography sx={{ fontWeight: 900, color: enterpriseTheme.primary, fontSize: "0.9rem", mr: 2, fontFamily: "'Inter', sans-serif" }}>
                            BOND TERMINAL
                        </Typography>

                        <Autocomplete
                            options={years}
                            size="small"
                            sx={{ width: "90px" }}
                            value={selectedYear}
                            onChange={(event, newValue) => setSelectedYear(newValue)}
                            renderInput={(params) => <TextField {...params} label="Year" variant="outlined" sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }} />}
                        />

                        <Autocomplete
                            options={shippingLines}
                            size="small"
                            sx={{ flex: 1.2 }}
                            value={selectedShippingLine}
                            onChange={(event, newValue) => setSelectedShippingLine(newValue)}
                            renderInput={(params) => <TextField {...params} label="Shipping Line" variant="outlined" sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }} />}
                        />

                        <Autocomplete
                            options={importers}
                            size="small"
                            sx={{ flex: 1.8 }}
                            value={selectedImporter}
                            onChange={(event, newValue) => setSelectedImporter(newValue)}
                            renderInput={(params) => <TextField {...params} label="Search Importer" variant="outlined" sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }} />}
                        />
                    </Box>

                    <Divider sx={{ mb: 1, borderColor: "#e0e0e0" }} />

                    {(selectedShippingLine && selectedImporter) ? (
                        <Box>
                            {/* Action Bar (Upload, Date, Variables, Buttons) */}
                            <Box sx={{ display: "flex", gap: 1.5, mb: 1, alignItems: "center", bgcolor: "#f9f9f9", p: 1, borderRadius: 0.5, border: "1px solid #eee" }}>
                                <Box sx={{ flex: 1.2 }}>
                                    <Typography className="compact-label" sx={{ mb: 0.5 }}>Repository</Typography>
                                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                        <FileUpload
                                            label="Upload"
                                            bucketPath={`bonds/${selectedShippingLine}/${selectedImporter}`}
                                            onFilesUploaded={(urls) => setFileUrl(urls[0] || "")}
                                            multiple={false}
                                            singleFileOnly={true}
                                        />
                                        {fileUrl && (
                                            <Box sx={{ width: "80px", "& .image-preview-container": { m: 0, p: 0 } }}>
                                                <ImagePreview
                                                    images={[fileUrl]}
                                                    onDeleteImage={() => setFileUrl("")}
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                </Box>

                                <Box sx={{ width: "120px" }}>
                                    <Typography className="compact-label" sx={{ mb: 0.5 }}>Validity</Typography>
                                    <TextField
                                        type="date"
                                        fullWidth
                                        size="small"
                                        value={validityDate}
                                        onChange={(e) => setValidityDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ '& .MuiInputBase-root': { fontSize: '0.65rem', height: '26px' } }}
                                    />
                                </Box>

                                <Divider orientation="vertical" flexItem />

                                <Box sx={{ flex: 3 }}>
                                    <Typography className="compact-label" sx={{ mb: 0.5 }}>Data Fields</Typography>
                                    <Box sx={{ display: "flex", gap: 0.3, flexWrap: "wrap" }}>
                                        {[
                                            { label: "Name", value: importerDetails?.importer },
                                            { label: "Address", value: importerDetails?.address },
                                            { label: "IEC", value: importerDetails?.ie_code_no },
                                            { label: "Bank", value: importerDetails?.bank_name },
                                            { label: "AD", value: importerDetails?.ad_code },
                                            { label: "BL", value: importerDetails?.bl_no },
                                            { label: "WT", value: importerDetails?.gross_weight },
                                            { label: "Pkgs", value: importerDetails?.packages },
                                        ].map((v) => (
                                            <button key={v.label} className="variable-chip" onClick={() => insertVariable(v.value || "")}>{v.label}</button>
                                        ))}
                                    </Box>
                                </Box>

                                <Box sx={{ display: "flex", gap: 0.5 }}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<SaveIcon sx={{ fontSize: "0.8rem !important" }} />}
                                        onClick={handleSave}
                                        disabled={loading}
                                        sx={{
                                            borderRadius: 0, height: '28px', fontSize: "0.65rem", fontWeight: 800, bgcolor: enterpriseTheme.primary,
                                            boxShadow: "none", textTransform: "none", px: 1.5
                                        }}
                                    >
                                        SAVE
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<PrintIcon sx={{ fontSize: "0.8rem !important" }} />}
                                        onClick={handlePrint}
                                        sx={{
                                            borderRadius: 0, height: '28px', fontSize: "0.65rem", fontWeight: 800, borderColor: enterpriseTheme.border,
                                            color: enterpriseTheme.text, textTransform: "none", px: 1.5
                                        }}
                                    >
                                        PRINT
                                    </Button>
                                </Box>
                            </Box>

                            <Box className="quill-wrapper" sx={{ border: `1px solid ${enterpriseTheme.border}` }}>
                                <ReactQuill
                                    ref={quillRef}
                                    theme="snow"
                                    value={bondContent}
                                    onChange={setBondContent}
                                    modules={quillModules}
                                    placeholder="Commence typing or paste document body..."
                                />
                            </Box>

                            <Typography variant="body2" sx={{ mt: 2, color: "#78909c", fontStyle: "italic" }}>
                                * The <strong>Bond Format Template</strong> is shared across all importers for <strong>{selectedShippingLine}</strong>.
                                The <strong>Uploaded Bond</strong> and <strong>Validity Date</strong> are unique to <strong>{selectedImporter}</strong>.
                            </Typography>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                p: 8,
                                textAlign: "center",
                                bgcolor: "#f5f5f5",
                                borderRadius: 3,
                                border: "2px dashed #cfd8dc",
                            }}
                        >
                            <Typography variant="h6" color="textSecondary">
                                Please select a Financial Year, Shipping Line, and Importer to manage the bond.
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        </React.Fragment>
    );
}

export default ImportBoands;

