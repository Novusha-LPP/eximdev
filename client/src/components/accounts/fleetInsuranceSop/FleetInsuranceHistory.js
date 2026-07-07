import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  CircularProgress,
  Tooltip
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import axios from "axios";
import { toast } from "react-hot-toast";

function FleetInsuranceHistory({ registrationNo, onEdit, onRenew, onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!registrationNo) return;
    
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/history/${encodeURIComponent(registrationNo)}`);
        setHistory(res.data || []);
      } catch (error) {
        console.error("Failed to fetch history", error);
        toast.error("Failed to load vehicle history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [registrationNo]);

  const getExpiryDateColor = (dateString) => {
    if (!dateString) return "inherit";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateString);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "red";
    if (diffDays <= 7) return "orange";
    return "green";
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            History: {registrationNo}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AutorenewIcon />}
          onClick={() => history.length > 0 && onRenew(history[0])}
          disabled={loading || history.length === 0}
        >
          Renew Policy
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell><b>Policy No</b></TableCell>
                <TableCell><b>Company</b></TableCell>
                <TableCell><b>From Date</b></TableCell>
                <TableCell><b>Expiry Date</b></TableCell>
                <TableCell><b>Fin Status</b></TableCell>
                <TableCell><b>UTR</b></TableCell>
                <TableCell><b>TAT</b></TableCell>
                <TableCell><b>Status</b></TableCell>
                <TableCell align="center"><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record._id} hover>
                  <TableCell>{record.policyNo || "-"}</TableCell>
                  <TableCell>{record.insuranceCompany || "-"}</TableCell>
                  <TableCell>
                    {record.policyFromDate ? new Date(record.policyFromDate).toLocaleDateString("en-IN") : "-"}
                  </TableCell>
                  <TableCell sx={{ color: getExpiryDateColor(record.policyToDate), fontWeight: "bold" }}>
                    {record.policyToDate ? new Date(record.policyToDate).toLocaleDateString("en-IN") : "-"}
                  </TableCell>
                  <TableCell>{record.financialApprovalStatus || "-"}</TableCell>
                  <TableCell>{record.paymentUtr || "-"}</TableCell>
                  <TableCell>{record.tat ? `${record.tat}d` : "-"}</TableCell>
                  <TableCell>{record.renewalStatus || record.renewed || "Pending"}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Policy">
                      <IconButton onClick={() => onEdit(record)} color="primary">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No history found for this vehicle.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default React.memo(FleetInsuranceHistory);
