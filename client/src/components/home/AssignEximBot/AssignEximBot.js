import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Button,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Snackbar,
    Alert,
    Box,
    Switch,
    FormControlLabel
} from "@mui/material";

function AssignEximBot({ selectedUser }) {
    const [loading, setLoading] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        type: "",
    });

    useEffect(() => {
        if (selectedUser) {
            fetchUserStatus();
        }
    }, [selectedUser]);

    const fetchUserStatus = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/user-exim-bot-status/${selectedUser}`
            );
            setHasAccess(res.data.can_access_exim_bot);
        } catch (error) {
            console.error("Error fetching status:", error);
            showSnackbar("Failed to fetch current status.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (event) => {
        const newValue = event.target.checked;

        // Optimistic update
        setHasAccess(newValue);

        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_STRING}/assign-exim-bot`,
                {
                    username: selectedUser,
                    can_access_exim_bot: newValue,
                }
            );
            showSnackbar(res.data.message, "success");
        } catch (error) {
            console.error("Error updating status:", error);
            // Revert on error
            setHasAccess(!newValue);
            showSnackbar("Failed to update access.", "error");
        }
    };

    const showSnackbar = (message, type) => {
        setSnackbar({ open: true, message, type });
    };

    const handleSnackbarClose = () => {
        setSnackbar({ open: false, message: "", type: "" });
    };

    if (!selectedUser) {
        return (
            <Card sx={{ maxWidth: 500, mt: 2 }}>
                <CardContent>
                    <Typography variant="body1" color="text.secondary">Please select a user to manage Exim Bot access.</Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="job-details-container">
            <h4>Manage Exim Bot Access</h4>

            <Card sx={{ maxWidth: 600, mt: 3, p: 2 }}>
                <CardContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={2}>
                            <Box display="flex" alignItems="center" gap={2}>
                                <Typography variant="h6">{selectedUser}</Typography>
                            </Box>

                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: hasAccess ? 'rgba(25, 118, 210, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: hasAccess ? 'primary.light' : 'divider'
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={hasAccess}
                                            onChange={handleToggle}
                                            color="primary"
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                Exim Bot Access
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {hasAccess
                                                    ? "User CAN access Exim Bot and run automations."
                                                    : "User CANNOT access Exim Bot features."
                                                }
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snackbar.type}>{snackbar.message}</Alert>
            </Snackbar>
        </div>
    );
}

export default AssignEximBot;
