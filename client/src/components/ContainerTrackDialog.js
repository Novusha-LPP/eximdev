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

        // Fields to exclude from the dynamic loop (already handled UI-wise or displayed specifically)
        const excludedFromDynamic = [
            "SHIPPING_LINE",
            "DETAILS", 
            "LAST_REPORTED_STATION", 
            "CONTAINER_SIZE", 
            "SIZE", 
            "CONTAINER_TYPE", 
            "TYPE", 
            "CONTAINER_ORIGNATING_STATION",
            "TRAIN_ORIGNATING_STATION",
            "CONTAINER_DESTINATION_STATION",
            "TRAIN_DESTINATION_STATION",
            "CONTAIN_SIZE" // Potential typo in API
        ];

        return (
            <Box
                key={containerNo}
                sx={{
                    mb: 2,
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    overflow: "hidden",
                }}
            >
                {/* Container Header */}
                <Box
                    sx={{
                        background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
                        color: "#fff",
                        px: 2,
                        py: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                    }}
                >
                    <LocalShippingIcon fontSize="small" />
                    <Typography fontWeight={700} fontSize={14}>
                        {containerNo}
                    </Typography>
                    {(track.CONTAINER_SIZE || track.SIZE || track.CONTAIN_SIZE) && (
                        <Chip
                            label={`${track.CONTAINER_SIZE || track.SIZE || track.CONTAIN_SIZE}ft`}
                            size="small"
                            sx={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 700, fontSize: 11 }}
                        />
                    )}
                    {(track.CONTAINER_TYPE || track.TYPE || track.CONTAINER_CATEGORY) && (
                        <Chip
                            label={track.CONTAINER_TYPE || track.TYPE || track.CONTAINER_CATEGORY}
                            size="small"
                            sx={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 11 }}
                        />
                    )}
                </Box>

                {/* Details */}
                <Box sx={{ px: 2, py: 1.5 }}>
                    {/* Highlight pill */}
                    {highlight && (
                        <Box
                            sx={{
                                background: "#f0fdf4",
                                border: "1px solid #86efac",
                                borderRadius: 1.5,
                                px: 1.5,
                                py: 0.75,
                                mb: 1.5,
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <LocationOnIcon sx={{ color: "#16a34a", fontSize: 16 }} />
                            <Typography fontSize={12} fontWeight={600} color="#166534">
                                {highlight}
                            </Typography>
                        </Box>
                    )}

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 1.5 }}>
                        <Table size="small">
                            <TableBody>
                                {/* Core fields first */}
                                {track.SHIPPING_LINE && (
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600, width: "40%", fontSize: 12 }}>Shipping Line</TableCell>
                                        <TableCell sx={{ fontSize: 12 }}>{track.SHIPPING_LINE}</TableCell>
                                    </TableRow>
                                )}
                                {(track.CONTAINER_TYPE || track.TYPE) && (
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Container Type</TableCell>
                                        <TableCell sx={{ fontSize: 12 }}>{track.CONTAINER_TYPE || track.TYPE}</TableCell>
                                    </TableRow>
                                )}
                                {(track.CONTAINER_SIZE || track.SIZE || track.CONTAIN_SIZE) && (
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Container Size</TableCell>
                                        <TableCell sx={{ fontSize: 12 }}>{track.CONTAINER_SIZE || track.SIZE || track.CONTAIN_SIZE} ft</TableCell>
                                    </TableRow>
                                )}
                                
                                {/* Dynamically render other fields from containerTrack */}
                                {Object.entries(track).map(([key, value]) => {
                                    if (excludedFromDynamic.includes(key) || !value) return null;
                                    
                                    // Format key for display (e.g. TRAIN_NUMBER -> Train Number)
                                    const displayKey = key.split('_').map(word => 
                                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                    ).join(' ');

                                    return (
                                        <TableRow key={key}>
                                            <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{displayKey}</TableCell>
                                            <TableCell sx={{ fontSize: 12 }}>{String(value)}</TableCell>
                                        </TableRow>
                                    );
                                })}

                                {details && (
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Last Status</TableCell>
                                        <TableCell sx={{ fontSize: 12 }}>{details}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Route info */}
                    {(originName || destName) && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                background: "#f8fafc",
                                borderRadius: 1.5,
                                px: 1.5,
                                py: 0.75,
                                border: "1px solid #e2e8f0",
                            }}
                        >
                            {originName && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <LocationOnIcon sx={{ fontSize: 13, color: "#2563eb" }} />
                                    <Typography fontSize={11} fontWeight={600} color="#1e3a5f">
                                        {originName}
                                    </Typography>
                                </Box>
                            )}
                            {originName && destName && (
                                <Typography fontSize={12} color="#9ca3af" sx={{ mx: 0.5 }}>→</Typography>
                            )}
                            {destName && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <LocationOnIcon sx={{ fontSize: 13, color: "#dc2626" }} />
                                    <Typography fontSize={11} fontWeight={600} color="#7f1d1d">
                                        {destName}
                                    </Typography>
                                </Box>
                            )}
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
            maxWidth="sm"
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
