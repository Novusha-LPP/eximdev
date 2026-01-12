import React, { useEffect, useState } from "react";
import { TextField, MenuItem, Button, Box, Typography, Paper } from "@mui/material";
import axios from "axios";

function AssignBranch({ selectedUser }) {
    const [selectedBranch, setSelectedBranch] = useState("AHMEDABAD HO");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function getUserBranch() {
            if (selectedUser) {
                setLoading(true);
                try {
                    const res = await axios.get(
                        `${process.env.REACT_APP_API_STRING}/get-user/${selectedUser}`
                    );
                    setSelectedBranch(res.data.assignedBranch || "AHMEDABAD HO");
                } catch (error) {
                    console.error("Error fetching user branch:", error);
                } finally {
                    setLoading(false);
                }
            }
        }
        getUserBranch();
    }, [selectedUser]);

    const handleSave = async () => {
        setLoading(true);
        setMessage("");
        try {
            await axios.post(`${process.env.REACT_APP_API_STRING}/assign-branch`, {
                username: selectedUser,
                branch: selectedBranch,
            });
            setMessage("Branch assigned successfully!");
        } catch (error) {
            console.error("Error assigning branch:", error);
            setMessage("Failed to assign branch.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 450, mx: "auto", mt: 4 }}>
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    borderRadius: "20px",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
                    background: "linear-gradient(to bottom, #ffffff, #f9fafb)"
                }}
            >
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 800,
                        mb: 1,
                        color: "#1E293B",
                        letterSpacing: "-0.5px"
                    }}
                >
                    Branch Assignment
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", mb: 4, fontWeight: 500 }}
                >
                    Set the primary working branch for <Box component="span" sx={{ color: "#667eea", fontWeight: 700 }}>{selectedUser}</Box>
                </Typography>

                <TextField
                    select
                    fullWidth
                    label="Active Branch"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    sx={{
                        mb: 3,
                        "& .MuiOutlinedInput-root": {
                            borderRadius: "12px",
                            backgroundColor: "#fff",
                            fontWeight: 600
                        }
                    }}
                >
                    <MenuItem value="AHMEDABAD HO" sx={{ fontWeight: 500 }}>
                        🏢 AHMEDABAD HO
                    </MenuItem>
                    <MenuItem value="GANDHIDHAM" sx={{ fontWeight: 500 }}>
                        🏭 GANDHIDHAM
                    </MenuItem>
                </TextField>

                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={loading || !selectedUser}
                    fullWidth
                    sx={{
                        py: 1.5,
                        borderRadius: "12px",
                        textTransform: "none",
                        fontSize: "1rem",
                        fontWeight: 700,
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                        "&:hover": {
                            background: "linear-gradient(135deg, #5a6fd6 0%, #694291 100%)",
                            boxShadow: "0 6px 20px rgba(102, 126, 234, 0.5)",
                        }
                    }}
                >
                    {loading ? "Updating..." : "Confirm Assignment"}
                </Button>

                {message && (
                    <Box
                        sx={{
                            mt: 3,
                            p: 2,
                            borderRadius: "10px",
                            backgroundColor: message.includes("success") ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 700,
                                color: message.includes("success") ? "#15803d" : "#b91c1c"
                            }}
                        >
                            {message.includes("success") ? "✅ " : "❌ "}{message}
                        </Typography>
                    </Box>
                )}
            </Paper>
        </Box>
    );
}

export default React.memo(AssignBranch);
