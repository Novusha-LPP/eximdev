import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Paper,
    Chip,
    Divider,
    IconButton,
    Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";

function ContainerTrackDialog({ open, onClose, containers }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        if (open && containers && containers.length > 0) {
            fetchTrackData();
        }
        if (!open) {
            setData(null);
            setError(null);
        }
        // eslint-disable-next-line
    }, [open, containers]);

    const fetchTrackData = async () => {
        setLoading(true);
        setError(null);
        try {
            const containerNos = containers.map((c) => c.containerNo || c).filter(Boolean);
            if (containerNos.length === 0) {
                throw new Error("No container numbers available.");
            }

            const response = await axios.post(
                `${process.env.REACT_APP_API_STRING}/container-track`,
                { containerNo: containerNos },
                { headers: { "Content-Type": "application/json" } }
            );

            // Structure: { success, data: { status, statusCode, message, data: { CONTAINER_NO: {...} } } }
            const containerData = response.data?.data?.data;
            if (containerData && typeof containerData === "object") {
                setData(containerData);
            } else {
                throw new Error(response.data?.data?.message || response.data?.message || "Failed to fetch container data");
            }
        } catch (err) {
            console.error("Container Track error:", err);
            setError(err.response?.data?.message || err.message || "Failed to fetch container tracking data");
        } finally {
            setLoading(false);
        }
    };

    const renderContainerCard = (containerNo, info) => {
        const track = info?.containerTrack || {};
        const mapData = info?.mapData || {};
        const start = mapData.startPoint || {};
        const end = mapData.endPoint || {};

        // Handle multiple tracking formats (old vs new API structure)
        const rawStatus = track.DETAILS || track.LAST_REPORTED_STATION || "";
        const details = rawStatus ? rawStatus.replace(/<[^>]*>/g, "") : "";
        
        // Extract bold portion (inside <b>...</b>) for highlight - compatible way
        let highlight = null;
        if (rawStatus.includes("<b>")) {
            const bolds = [];
            const regex = /<b>(.*?)<\/b>/g;
            let m;
            while ((m = regex.exec(rawStatus)) !== null) {
                bolds.push(m[1]);
            }
            if (bolds.length > 1) {
                highlight = `${bolds[0]} @ ${bolds[1]}`;
            } else if (bolds.length === 1) {
                highlight = bolds[0];
            }
        }

        // Determine Origin and Destination Display
        const originName = start.terminal_name || track.CONTAINER_ORIGNATING_STATION || track.TRAIN_ORIGNATING_STATION || "";
        const destName = end.terminal_name || track.CONTAINER_DESTINATION_STATION || track.TRAIN_DESTINATION_STATION || "";

        // Fields to exclude from the grid (already handled UI-wise or headers)
        const headerInfoFields = ["CONTAIN_SIZE", "SIZE", "CONTAINER_SIZE", "TYPE", "CONTAINER_TYPE", "CONTAINER_CATEGORY"];
        const statusKeys = ["DETAILS", "LAST_REPORTED_STATION"];

        const getMetadataFields = () => {
            const fields = [];
            const seen = new Set([...headerInfoFields, ...statusKeys]);
            
            // Preferred order for common keys
            const preferredOrder = [
                "SHIPPING_LINE", "TRAIN_NUMBER", "WAGON_NUMBER", "DEPARTURE_DATE_&_TIME",
                "TRAIN_ORIGNATING_STATION", "TRAIN_DESTINATION_STATION", 
                "CONTAINER_ORIGNATING_STATION", "CONTAINER_DESTINATION_STATION"
            ];
            
            preferredOrder.forEach(key => {
                if (track[key]) {
                    fields.push({ key, value: track[key] });
                    seen.add(key);
                }
            });

            // Catch any other API fields
            Object.keys(track).forEach(key => {
                if (!seen.has(key) && track[key]) {
                    fields.push({ key, value: track[key] });
                }
            });
            return fields;
        };

        const metadataFields = getMetadataFields();

        // Helper for icons mapping based on field name
        const getFieldIcon = (key) => {
            const k = key.toUpperCase();
            if (k.includes("SHIPPING")) return <span role="img" aria-label="ship" style={{ fontSize: "20px" }}>🚢</span>;
            if (k.includes("TRAIN")) return <span role="img" aria-label="train" style={{ fontSize: "20px" }}>🚂</span>;
            if (k.includes("WAGON")) return <span role="img" aria-label="wagon" style={{ fontSize: "18px" }}>🚃</span>;
            if (k.includes("STATION") || k.includes("LOCATION") || k.includes("POINT")) 
                return <LocationOnIcon sx={{ fontSize: 18, color: "#64748b" }} />;
            if (k.includes("DATE") || k.includes("TIME")) 
                return <span role="img" aria-label="clock" style={{ fontSize: "18px" }}>🕒</span>;
            return null;
        };

        return (
            <Box
                key={containerNo}
                sx={{
                    mb: 4,
                    border: "1px solid #e2e8f0",
                    borderRadius: 3,
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)"
                }}
            >
                {/* Header Section */}
                <Box
                    sx={{
                        background: "#2563eb",
                        color: "#fff",
                        px: 2.5,
                        py: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                    }}
                >
                    <LocalShippingIcon fontSize="small" />
                    <Typography fontSize={16} fontWeight={900} sx={{ letterSpacing: 0.5 }}>
                        {containerNo}
                    </Typography>
                    
                    <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
                        {(track.CONTAINER_SIZE || track.SIZE || track.CONTAIN_SIZE) && (
                            <Chip
                                label={`${track.CONTAINER_SIZE || track.SIZE || track.CONTAIN_SIZE}ft`}
                                size="small"
                                sx={{ backgroundColor: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 800, px: 0.5 }}
                            />
                        )}
                        {(track.CONTAINER_TYPE || track.TYPE || track.CONTAINER_CATEGORY) && (
                            <Chip
                                label={track.CONTAINER_TYPE || track.TYPE || track.CONTAINER_CATEGORY}
                                size="small"
                                sx={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700 }}
                            />
                        )}
                    </Box>
                </Box>

                <Box sx={{ p: 2.5 }}>
                    {/* Metadata Grid */}
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                            gap: 2,
                        }}
                    >
                        {metadataFields.map((field) => (
                            <Box
                                key={field.key}
                                sx={{
                                    p: 2.5,
                                    border: "1px solid #f1f5f9",
                                    borderRadius: 3,
                                    backgroundColor: "#fff",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1.5,
                                    minHeight: "110px",
                                    transition: "all 0.2s",
                                    "&:hover": { borderColor: "#cbd5e1", backgroundColor: "#fafafa" }
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    {getFieldIcon(field.key)}
                                    <Typography
                                        sx={{
                                            fontSize: "11px",
                                            fontWeight: 700,
                                            color: "#64748b",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em"
                                        }}
                                    >
                                        {field.key.replace(/_/g, " ")}
                                    </Typography>
                                </Box>
                                <Typography
                                    sx={{
                                        fontSize: "16px",
                                        fontWeight: 900,
                                        color: "#0f172a",
                                        lineHeight: 1.2
                                    }}
                                >
                                    {String(field.value)}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Prominent Status Fields */}
                    {statusKeys.map(key => track[key] && (
                        <Box
                            key={key}
                            sx={{
                                mt: 2.5,
                                p: 3,
                                backgroundColor: key === "LAST_REPORTED_STATION" ? "#fff1f2" : "#fff",
                                borderRadius: 4,
                                border: `1px solid ${key === "LAST_REPORTED_STATION" ? "#ffe4e6" : "#f1f5f9"}`,
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                                <LocationOnIcon sx={{ fontSize: 20, color: "#64748b" }} />
                                <Typography sx={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {key.replace(/_/g, " ")}
                                </Typography>
                            </Box>
                            <Typography
                                sx={{
                                    fontSize: "17px",
                                    fontWeight: 700,
                                    color: "#1e293b",
                                    lineHeight: 1.6,
                                    "& b": { 
                                        color: "#2563eb", 
                                        fontWeight: 900,
                                        backgroundColor: "#eff6ff",
                                        px: 0.8,
                                        py: 0.2,
                                        borderRadius: 1,
                                        display: "inline-block",
                                        mx: 0.2,
                                        textTransform: "uppercase"
                                    }
                                }}
                                dangerouslySetInnerHTML={{ __html: track[key] }}
                            />
                        </Box>
                    ))}

                    {/* Dynamic Route Map Summary */}
                    {(originName || destName) && (
                        <Box
                            sx={{
                                mt: 3,
                                p: 3.5,
                                backgroundColor: "#f8fafc",
                                borderRadius: 4,
                                border: "1px solid #e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                position: "relative",
                                borderLeft: "6px solid #2563eb"
                            }}
                        >
                            <Box sx={{ flex: 1.2 }}>
                                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, textTransform: "uppercase", mb: 1, display: "block", letterSpacing: "0.05em" }}>
                                    Origin Station
                                </Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                                    <LocationOnIcon sx={{ color: "#64748b", fontSize: 24 }} />
                                    <Typography sx={{ fontSize: "18px", fontWeight: 900, color: "#0f172a" }}>
                                        {originName}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ flex: 1, display: "flex", alignItems: "center", position: "relative", px: 1 }}>
                                <Box sx={{ flex: 1, height: "1px", backgroundColor: "#cbd5e1" }} />
                                <LocalShippingIcon sx={{ mx: 1.5, color: "#64748b", fontSize: 26 }} />
                                <Box sx={{ flex: 1, height: "1px", backgroundColor: "#cbd5e1", position: "relative" }}>
                                    <Box sx={{ position: "absolute", right: -5, top: -4, width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "10px solid #cbd5e1" }} />
                                </Box>
                            </Box>

                            <Box sx={{ flex: 1.2, textAlign: "right" }}>
                                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, textTransform: "uppercase", mb: 1, display: "block", letterSpacing: "0.05em" }}>
                                    Destination Station
                                </Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, justifyContent: "flex-end" }}>
                                    <Typography sx={{ fontSize: "18px", fontWeight: 900, color: "#991b1b" }}>
                                        {destName}
                                    </Typography>
                                    <LocationOnIcon sx={{ color: "#dc2626", fontSize: 24 }} />
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    const containerLabel = containers?.length === 1
        ? (containers[0]?.containerNo || containers[0])
        : `${containers?.length} Containers`;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { minHeight: "40vh" } }}
        >
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocalShippingIcon sx={{ color: "#2563eb" }} />
                    <Box>
                        <Typography variant="h6" fontSize={15} fontWeight={700}>
                            Container Tracking
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {containerLabel} — via CONCOR India
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 2 }}>
                {loading ? (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="200px" gap={2}>
                        <CircularProgress size={36} />
                        <Typography color="text.secondary" fontSize={13}>
                            Fetching container data from CONCOR...
                        </Typography>
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {error}
                    </Alert>
                ) : data ? (
                    <Box>
                        {Object.entries(data).map(([containerNo, info]) =>
                            renderContainerCard(containerNo, info)
                        )}
                    </Box>
                ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="150px">
                        <Typography color="text.secondary">No data available.</Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <IconButton
                    onClick={fetchTrackData}
                    disabled={loading}
                    size="small"
                    title="Refresh"
                >
                    <RefreshIcon />
                </IconButton>
                <Button onClick={onClose} size="small">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ContainerTrackDialog;
