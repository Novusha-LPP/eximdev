import React, { forwardRef, useImperativeHandle, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    Typography,
    Box,
    Paper,
    Divider,
    Grid,
    IconButton,
    DialogContentText
} from "@mui/material";
import logo_concor from "../../assets/images/image.png";
import logo_cci from "../../assets/images/image copy.png";
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

const ConcorJobOrderPDF = forwardRef(({ jobData }, ref) => {
    const [open, setOpen] = useState(false);
    const [currentJob, setCurrentJob] = useState(null);
    const [deliveryType, setDeliveryType] = useState(""); // 'FACTORY', 'DIRECT', 'WAREHOUSE', 'LCL'
    const [containerRemarks, setContainerRemarks] = useState({});

    // New Options
    const [pdaOption, setPdaOption] = useState("SFPL"); // 'SFPL' (default) | 'IMPORTER'
    const [gstOption, setGstOption] = useState("IMPORTER"); // 'IMPORTER' (default) | 'SFPL'

    // Confirmation State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingChange, setPendingChange] = useState(null); // { type: 'pda'|'gst', value: string }

    useImperativeHandle(ref, () => ({
        generatePdf: (data) => {
            setCurrentJob(data);

            // Auto-detect delivery type
            const typeOfDo = data.type_of_Do?.trim().toUpperCase();
            const consignmentType = data.consignment_type?.trim().toUpperCase();

            if (consignmentType === "LCL") {
                setDeliveryType("LCL");
            } else if (typeOfDo === "FACTORY") {
                setDeliveryType("FACTORY");
            } else if (typeOfDo === "ICD") {
                setDeliveryType("DIRECT");
            } else {
                setDeliveryType("DIRECT");
            }

            const initialRemarks = {};
            data.container_nos?.forEach(c => {
                initialRemarks[c.container_number] = "";
            });
            setContainerRemarks(initialRemarks);

            // Reset to defaults
            setPdaOption("SFPL");
            setGstOption("IMPORTER");

            setOpen(true);
        },
    }));

    const handleClose = () => {
        setOpen(false);
    };

    const handleRemarkChange = (containerNo, value) => {
        setContainerRemarks(prev => ({
            ...prev,
            [containerNo]: value
        }));
    };

    const handleConfirm = () => {
        generate(currentJob, deliveryType, containerRemarks, pdaOption, gstOption);
        setOpen(false);
    };

    const handleOptionChange = (type, value) => {
        // Defaults: PDA -> SFPL, GST -> IMPORTER
        const isDefault = (type === 'pda' && value === 'SFPL') || (type === 'gst' && value === 'IMPORTER');

        if (!isDefault) {
            // Changing from default (or any state) to non-default triggers confirmation 
            // per user request "changes from default to other option"
            // We can strictly follow "from default" check, or just "to non-default" check.
            // Current state check:
            const currentVal = type === 'pda' ? pdaOption : gstOption;
            const defaultVal = type === 'pda' ? 'SFPL' : 'IMPORTER';

            if (currentVal === defaultVal) {
                setPendingChange({ type, value });
                setConfirmOpen(true);
                return;
            }
        }

        // If going back to default or already on non-default and switching (if we had 3rd option), just set it
        if (type === 'pda') setPdaOption(value);
        if (type === 'gst') setGstOption(value);
    };

    const confirmChange = () => {
        if (pendingChange) {
            if (pendingChange.type === 'pda') setPdaOption(pendingChange.value);
            if (pendingChange.type === 'gst') setGstOption(pendingChange.value);
        }
        setConfirmOpen(false);
        setPendingChange(null);
    };

    const cancelChange = () => {
        setConfirmOpen(false);
        setPendingChange(null);
    };

    const generate = (data, selectedType, remarksMap, pdaType, gstType) => {
        const doc = new jsPDF({
            orientation: "p",
            unit: "pt",
            format: "a4",
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const leftMargin = 30;
        const rightMargin = 30;
        const topMargin = 20;

        const addImage = (imgData, x, y, w, h) => {
            try {
                doc.addImage(imgData, "PNG", x, y, w, h);
            } catch (e) {
                console.error("Error adding image:", e);
            }
        };

        addImage(logo_cci, leftMargin + 10, topMargin, 80, 60);
        addImage(logo_concor, pageWidth / 2 - 120, topMargin, 240, 60);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        const addressLine = "ICD-KHODIYAR, Jamiyatpura village Road, Nr. Khodiyar Railway Station, S.G. Highway, Ta. & Dist. Gandhinagar";
        doc.text(addressLine, pageWidth / 2, topMargin + 80, { align: "center" });

        doc.setFontSize(11);
        const titleLine = "...Concor Job Order OF IMPORT CONTAINERS/CARGO...";
        doc.text(titleLine, pageWidth / 2, topMargin + 105, { align: "center" });

        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString("en-GB")}`, leftMargin, topMargin + 140);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("ICD Khodiyar", leftMargin, topMargin + 170);
        doc.text("Please allow to load containers/cargo on Vehicles as mentioned below.", leftMargin, topMargin + 185);

        const tickPlaceholder = "";
        const table1Data = [[
            selectedType === "FACTORY" ? tickPlaceholder : "-",
            selectedType === "DIRECT" ? tickPlaceholder : "-",
            selectedType === "LCL" ? tickPlaceholder : "-",
            selectedType === "WAREHOUSE" ? tickPlaceholder : "-"
        ]];

        doc.autoTable({
            startY: topMargin + 200,
            head: [["FACTORY DESTUFFING", "DIRECT DELIVERY", "LCL JOB ORDER", "WAREHOUSE-DELIVERY"]],
            body: table1Data,
            theme: "grid",
            styles: {
                halign: "center",
                valign: "middle",
                fontSize: 9,
                fontStyle: "bold",
                textColor: [0, 0, 0],
                lineColor: [0, 0, 0],
                lineWidth: 1,
                minCellHeight: 30
            },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
            margin: { left: leftMargin, right: rightMargin },
            didDrawCell: (data) => {
                if (data.row.section === 'body' && data.cell.text[0] === tickPlaceholder) {
                    data.cell.text = [""];
                    const x = data.cell.x + data.cell.width / 2;
                    const y = data.cell.y + data.cell.height / 2;
                    doc.setDrawColor(0, 128, 0);
                    doc.setLineWidth(2);
                    doc.line(x - 6, y, x - 2, y + 4);
                    doc.line(x - 2, y + 4, x + 6, y - 6);
                    doc.setDrawColor(0, 0, 0);
                }
            }
        });

        const jobDetailsStartY = doc.lastAutoTable.finalY + 5;
        const detailsData = [
            [
                { content: "BOE NO", styles: { fontStyle: "bold" } },
                { content: data.be_no || "" },
                { content: "GST NO", styles: { fontStyle: "bold" } },
                { content: gstType === 'SFPL' ? "24AAKCS6838D1Z8 (SFPL)" : (data.gst_no || "") }
            ],
            [
                { content: "DATE", styles: { fontStyle: "bold" } },
                { content: data.be_date || "" },
                { content: "PDA A/C", styles: { fontStyle: "bold" } },
                { content: pdaType === 'IMPORTER' ? (data.importer || "") : "SURPV" }
            ],
            [
                { content: "SURAJ FORWARDERS & SHIPPING AGENCIES", colSpan: 2, styles: { fontStyle: "bold", textColor: [5, 43, 203] } },
                { content: "SHIPPING LINE", styles: { fontStyle: "bold" } },
                { content: data.shipping_line_airline || "" }
            ]
        ];

        doc.autoTable({
            startY: jobDetailsStartY,
            body: detailsData,
            theme: "grid",
            styles: { fontSize: 10, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 1 },
            margin: { left: leftMargin, right: rightMargin },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: "auto" },
                2: { cellWidth: 80 },
                3: { cellWidth: "auto" }
            }
        });

        const containers = data.container_nos || [];
        const containerTableBody = containers.map((c, index) => [
            index + 1,
            c.container_number || "",
            c.size || "",
            c.vehicle_no || "",
            remarksMap[c.container_number] || ""
        ]);

        while (containerTableBody.length < 10) {
            containerTableBody.push([containerTableBody.length + 1, "", "", "", ""]);
        }

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [["SR NO", "CONTAINER NO.", "SIZE", "VEHICLE NO.", "REMARKS & VALIDITY"]],
            body: containerTableBody,
            theme: "grid",
            styles: { halign: "center", fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 1 },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold" },
            margin: { left: leftMargin, right: rightMargin },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 120 },
                2: { cellWidth: 50 },
                3: { cellWidth: 80 },
                4: { cellWidth: "auto" }
            }
        });

        const finalY = doc.lastAutoTable.finalY + 30;
        doc.setFontSize(10);
        doc.text("Suraj Forwarders & Shipping Agencies.", pageWidth - rightMargin - 180, finalY);
        doc.text("Signatory", pageWidth - rightMargin - 100, finalY + 40);

        window.open(doc.output("bloburl"), "_blank");
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.main', color: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <AssignmentIcon />
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                            Concor Job Order Generation
                        </Typography>
                    </Box>
                    <IconButton onClick={handleClose} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3 }}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="text.secondary">Importer</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{currentJob?.importer}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <Typography variant="caption" color="text.secondary">Job No</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{currentJob?.job_no} ({currentJob?.year})</Typography>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <Typography variant="caption" color="text.secondary">Custom House</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{currentJob?.custom_house}</Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    <Box sx={{ mb: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: 'primary.dark' }}>
                            <LocalShippingIcon fontSize="small" />
                            DELIVERY TYPE
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Paper variant="outlined" sx={{ p: 2, borderStyle: 'dashed', borderColor: 'primary.light', bgcolor: '#e3f2fd22' }}>
                            <RadioGroup
                                row
                                value={deliveryType}
                                onChange={(e) => setDeliveryType(e.target.value)}
                                sx={{ justifyContent: 'space-around' }}
                            >
                                <FormControlLabel value="FACTORY" control={<Radio />} label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Factory Destuffing</Typography>} />
                                <FormControlLabel value="DIRECT" control={<Radio />} label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Direct Delivery</Typography>} />
                                <FormControlLabel value="WAREHOUSE" control={<Radio />} label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Warehouse Delivery</Typography>} />
                                <FormControlLabel value="LCL" control={<Radio />} label={<Typography variant="body2" sx={{ fontWeight: 500 }}>LCL Job Order</Typography>} />
                            </RadioGroup>
                        </Paper>
                    </Box>

                    <Box sx={{ mb: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: 'primary.dark' }}>
                            <AssignmentIcon fontSize="small" />
                            DOCUMENTATION DETAILS
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'white' }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                                        PDA Account (Default: SFPL)
                                    </Typography>
                                    <RadioGroup
                                        row
                                        value={pdaOption}
                                        onChange={(e) => handleOptionChange('pda', e.target.value)}
                                    >
                                        <FormControlLabel value="SFPL" control={<Radio size="small" />} label={<Typography variant="body2">SFPL</Typography>} />
                                        <FormControlLabel value="IMPORTER" control={<Radio size="small" />} label={<Typography variant="body2">Importer</Typography>} />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                                        Invoice GST (Default: Importer)
                                    </Typography>
                                    <RadioGroup
                                        row
                                        value={gstOption}
                                        onChange={(e) => handleOptionChange('gst', e.target.value)}
                                    >
                                        <FormControlLabel value="IMPORTER" control={<Radio size="small" />} label={<Typography variant="body2">Importer GST</Typography>} />
                                        <FormControlLabel value="SFPL" control={<Radio size="small" />} label={<Typography variant="body2">SFPL</Typography>} />
                                    </RadioGroup>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Box>

                    <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: 'primary.dark' }}>
                        <AssignmentIcon fontSize="small" />
                        CONTAINER REMARKS AND VALIDITY
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {currentJob?.container_nos?.map((container, index) => (
                            <Paper key={index} variant="outlined" sx={{ p: 2, transition: '0.2s', '&:hover': { bgcolor: '#fdfdfd', borderColor: 'primary.main' } }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} sm={4}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                {index + 1}
                                            </Box>
                                            <Typography variant="body2">
                                                <strong>{container.container_number}</strong>
                                                <span style={{ color: '#666', marginLeft: 8 }}>({container.size} ft)</span>
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={8}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Remarks and Validity"
                                            variant="outlined"
                                            placeholder="Enter validity or specific instructions..."
                                            value={containerRemarks[container.container_number] || ""}
                                            onChange={(e) => handleRemarkChange(container.container_number, e.target.value)}
                                            sx={{ bgcolor: 'white' }}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        ))}
                        {(!currentJob?.container_nos || currentJob?.container_nos.length === 0) && (
                            <Typography variant="body2" sx={{ fontStyle: 'italic', colors: 'text.secondary', textAlign: 'center', py: 2 }}>
                                No containers found for this job.
                            </Typography>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2.5, px: 3, borderTop: '1px solid #eee', bgcolor: '#fcfcfc' }}>
                    <Button onClick={handleClose} variant="outlined" color="inherit" sx={{ borderRadius: 1.5, px: 3 }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        variant="contained"
                        disabled={!deliveryType}
                        startIcon={<DoneIcon />}
                        sx={{ borderRadius: 1.5, px: 4, boxShadow: 2 }}
                    >
                        Generate & Download PDF
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmOpen} onClose={cancelChange}>
                <DialogTitle>Confirm Change</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        You are explicitly changing the selection from the default value.
                        Please confirm if this is intentional to avoid mistakes.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelChange} color="inherit">Cancel</Button>
                    <Button onClick={confirmChange} variant="contained" color="warning" autoFocus>
                        Confirm Change
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
});

export default ConcorJobOrderPDF;
