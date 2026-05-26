import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Link, useNavigate } from "react-router-dom";
import {
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Button,
  Box,
  Typography,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  MenuItem,
  CircularProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext.js";
import { UserContext } from "../../contexts/UserContext";

function GeneralJobs() {
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { searchQuery, setSearchQuery, selectedImporter, setSelectedImporter } = useSearchQuery();
  const { user } = useContext(UserContext);

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const limit = 100;

  const navigate = useNavigate();

  // Create Job dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvedImporters, setApprovedImporters] = useState([]);
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [nextSeqPreview, setNextSeqPreview] = useState("");
  const [savingJob, setSavingJob] = useState(false);

  // Form states
  const [formValues, setFormValues] = useState({
    importer: "",
    iecode: "",
    pan: "",
    gst: "",
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Get all organizations from master directory
  const fetchKycList = async () => {
    try {
      setKycLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/organization`);
      setApprovedImporters(res.data?.organizations || []);
    } catch (error) {
      console.error("Error fetching organizations master directory list:", error);
    } finally {
      setKycLoading(false);
    }
  };

  // Get next general job number preview
  const fetchNextJobNoPreview = async () => {
    if (!selectedYearState) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-general-jobs`, {
        params: { year: selectedYearState, limit: 1 }
      });
      const count = res.data?.totalJobs || 0;
      const nextSequence = count + 1;
      const paddedSequence = nextSequence.toString().padStart(4, '0');
      setNextSeqPreview(`GEN/IMP/${paddedSequence}/${selectedYearState}`);
    } catch (error) {
      console.error("Error fetching next job number preview:", error);
    }
  };

  // Fetch jobs
  const fetchJobs = useCallback(async (currentPage, currentSearchQuery, currentImporter, currentYear) => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-general-jobs`, {
        params: {
          page: currentPage,
          limit,
          search: currentSearchQuery,
          importer: currentImporter?.trim() || "",
          year: currentYear || "",
        },
      });

      const { totalJobs, totalPages, jobs } = res.data;
      setRows(jobs || []);
      setTotalPages(totalPages || 1);
      setTotalJobs(totalJobs || 0);
    } catch (error) {
      console.error("Error fetching general jobs:", error);
      setRows([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (selectedYearState) {
      fetchJobs(page, debouncedSearchQuery, selectedImporter, selectedYearState);
    }
  }, [page, debouncedSearchQuery, selectedImporter, selectedYearState, fetchJobs]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleOpenDialog = () => {
    fetchKycList();
    fetchNextJobNoPreview();
    setSelectedKyc(null);
    setFormValues({
      importer: "",
      iecode: "",
      pan: "",
      gst: "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleImporterChange = (event, newValue) => {
    if (!newValue) {
      setSelectedKyc(null);
      setFormValues({ importer: "", iecode: "", pan: "", gst: "" });
      return;
    }

    const org = approvedImporters.find(o => o.name === newValue);
    if (org) {
      setSelectedKyc(org);
      setFormValues({
        importer: org.name || "",
        iecode: org.iec_no || "",
        pan: org.pan_no || "",
        gst: org.gst_no || "",
      });
    }
  };

  const handleSaveJob = async () => {
    if (!formValues.importer) {
      setSnackbar({ open: true, message: "Please select an importer", severity: "error" });
      return;
    }

    try {
      setSavingJob(true);
      await axios.post(`${process.env.REACT_APP_API_STRING}/add-general-job`, {
        importer: formValues.importer,
        iecode: formValues.iecode,
        pan: formValues.pan,
        gst: formValues.gst,
        year: selectedYearState,
      });

      setSnackbar({ open: true, message: "General job created successfully", severity: "success" });
      setDialogOpen(false);
      fetchJobs(page, debouncedSearchQuery, selectedImporter, selectedYearState);
    } catch (error) {
      console.error("Error creating general job:", error);
      setSnackbar({ open: true, message: "Failed to create general job", severity: "error" });
    } finally {
      setSavingJob(false);
    }
  };

  const columns = React.useMemo(
    () => [
      {
        accessorKey: "job_number",
        header: "Job No",
        muiTableHeadCellProps: { align: "center" },
        muiTableBodyCellProps: { sx: { verticalAlign: "middle", textAlign: "center" } },
        size: 250,
        Cell: ({ cell }) => {
          const { job_no, job_number, year, branch_code, trade_type, mode } = cell.row.original;
          return (
            <Link
              to={`/view-billing-job/${branch_code}/${trade_type}/${mode}/${job_no}/${year}`}
              state={{ workMode: 'Payment' }}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                cursor: "pointer",
                color: "#1976d2",
                fontWeight: "bold",
                padding: "8px 12px",
                borderRadius: "6px",
                textDecoration: "none",
                background: "rgba(25, 118, 210, 0.04)",
                transition: "all 0.2s ease"
              }}
            >
              {job_number}
            </Link>
          );
        }
      },
      {
        accessorKey: "importer",
        header: "Importer",
        size: 250,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ fontWeight: "600" }}>{cell.getValue()}</Typography>
        )
      },
      {
        accessorKey: "ie_code_no",
        header: "IE Code",
        size: 150,
        Cell: ({ cell }) => cell.getValue() || "-"
      },
      {
        accessorKey: "pan_no",
        header: "PAN No",
        size: 150,
        Cell: ({ cell }) => cell.getValue() || "-"
      },
      {
        accessorKey: "gst_no",
        header: "GST No",
        size: 180,
        Cell: ({ cell }) => cell.getValue() || "-"
      },
      {
        accessorKey: "detailed_status",
        header: "Status",
        size: 150,
        Cell: ({ cell }) => (
          <Box sx={{
            px: 2,
            py: 0.5,
            borderRadius: "12px",
            fontSize: "0.75rem",
            fontWeight: "700",
            display: "inline-block",
            color: "#e65100",
            backgroundColor: "#fff3e0",
            border: "1px solid #ffe0b2"
          }}>
            {cell.getValue() || "Billing Pending"}
          </Box>
        )
      },
    ],
    []
  );

  const tableConfig = {
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_number"] },
    },
    enableGlobalFilter: false,
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    enablePinning: true,
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    renderTopToolbarCustomActions: () => (
      <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", marginRight: "auto" }}>
          General Jobs ({totalJobs})
        </Typography>

        <Button
          variant="contained"
          color="success"
          size="small"
          onClick={handleOpenDialog}
          sx={{
            mr: 2,
            fontWeight: "bold",
            background: "linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)",
            boxShadow: "0 4px 12px rgba(46, 125, 50, 0.2)",
            textTransform: "none",
            borderRadius: 2,
            "&:hover": {
              background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)",
            }
          }}
        >
          + Add New Job
        </Button>

        <TextField
          placeholder="Search general jobs..."
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchInputChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setPage(1)}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: "300px" }}
        />
      </div>
    ),
  };

  return (
    <div style={{ height: "80%", padding: "10px" }}>
      <MaterialReactTable {...tableConfig} />
      <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>

      {/* Dialog for creating a General Job */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: "1px solid #eee", pb: 2, fontWeight: "bold" }}>
          Create New General Job
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box display="flex" flexDirection="column" gap={3} sx={{ pt: 1 }}>
            {nextSeqPreview && (
              <Alert severity="info" sx={{ fontWeight: "600" }}>
                Job Number Preview: {nextSeqPreview}
              </Alert>
            )}

            <Autocomplete
              options={approvedImporters.map(k => k.name)}
              loading={kycLoading}
              onChange={handleImporterChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Importer"
                  required
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {kycLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <TextField
              label="IE Code"
              value={formValues.iecode}
              InputProps={{ readOnly: true }}
              disabled
              fullWidth
            />

            <TextField
              label="PAN No"
              value={formValues.pan}
              InputProps={{ readOnly: true }}
              disabled
              fullWidth
            />

            <TextField
              label="GST No"
              value={formValues.gst}
              InputProps={{ readOnly: true }}
              disabled
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #eee", px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleSaveJob}
            color="success"
            variant="contained"
            disabled={savingJob || kycLoading}
            sx={{ fontWeight: "bold" }}
          >
            {savingJob ? "Saving..." : "Save Job"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default React.memo(GeneralJobs);
