import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Link, useNavigate } from "react-router-dom";
import { TabContext } from "../eSanchit/ESanchitTab.js";
import {
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Button,
  Box,
  Badge,
  Typography,
  MenuItem,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  CircularProgress,
  Divider,
  Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext.js";
import { UserContext } from "../../contexts/UserContext.js";
import DocsCell from "../gallery/DocsCell.js";
import { BranchContext } from "../../contexts/BranchContext.js";

import ContainerTrackButton from '../ContainerTrackButton';
import logo from "../../assets/images/logo.webp";

function PaymentRequested() {
  const { currentTab } = useContext(TabContext); // Access context
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const {
    searchQuery,
    setSearchQuery,
    selectedImporter,
    setSelectedImporter,
    currentPageTab0: currentPage,
    setCurrentPageTab0: setCurrentPage,
  } = useSearchQuery();
  useSearchQuery();
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const { user } = useContext(UserContext);
  const { selectedBranch, selectedCategory } = useContext(BranchContext);
  const [years, setYears] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(1); // Total number of pages
  const [loading, setLoading] = useState(false); // Loading state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery); // Debounced search query
  const limit = 100; // Number of items per page
  const [totalJobs, setTotalJobs] = useState(0); // Total job count
  const navigate = useNavigate();
  const [importers, setImporters] = useState("");
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [utrInput, setUtrInput] = useState("");
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);

  const fetchPaymentRequestDetails = async (requestNo) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-payment-request-details/${encodeURIComponent(requestNo)}`
      );
      setSelectedPaymentRequest(res.data);
    } catch (err) {
      console.error("Error fetching payment request details:", err);
    }
  };

  const handleViewPaymentRequest = async (requestNo) => {
    setIsModalLoading(true);
    setOpenDetailModal(true);
    await fetchPaymentRequestDetails(requestNo);
    setIsModalLoading(false);
  };

  const handleUpdateUTR = async () => {
    if (!utrInput.trim()) return;
    setIsSubmittingUtr(true);
    try {
      const displayName = user ? `${user.first_name} ${user.last_name}` : (localStorage.getItem("username") || "Unknown");
      await axios.patch(`${process.env.REACT_APP_API_STRING}/update-payment-utr`, {
        requestNo: selectedPaymentRequest.requestNo,
        utrNumber: utrInput
      }, {
        headers: { username: displayName }
      });
      
      // Refresh details
      await fetchPaymentRequestDetails(selectedPaymentRequest.requestNo);
      setUtrInput("");
      // Refresh main table
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
        showUnresolvedOnly,
        user?.username,
        selectedBranch,
        selectedCategory
      );
    } catch (err) {
      console.error("Error updating UTR:", err);
      alert("Failed to update UTR. Please try again.");
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  // Get importer list for MUI autocomplete
  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYearState) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`
        );
        setImporters(res.data);
      }
    }
    getImporterList();
  }, [selectedYearState]);

  const getUniqueImporterNames = (importerData) => {
    if (!importerData || !Array.isArray(importerData)) return [];
    const uniqueImporters = new Set();
    return importerData
      .filter((importer) => {
        if (uniqueImporters.has(importer.importer)) return false;
        uniqueImporters.add(importer.importer);
        return true;
      })
      .map((importer, index) => ({
        label: importer.importer,
        key: `${importer.importer}-${index}`,
      }));
  };

  const importerNames = [...getUniqueImporterNames(importers)];

  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        const filteredYears = res.data.filter((year) => year !== null);
        setYears(filteredYears);

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
        const currentTwoDigits = String(currentYear).slice(-2);
        const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");

        let defaultYearPair =
          currentMonth >= 4
            ? `${currentTwoDigits}-${nextTwoDigits}`
            : `${prevTwoDigits}-${currentTwoDigits}`;

        if (!selectedYearState && filteredYears.length > 0) {
          setSelectedYearState(
            filteredYears.includes(defaultYearPair)
              ? defaultYearPair
              : filteredYears[0]
          );
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, [selectedYearState, setSelectedYearState]);

  // Fetch jobs with pagination and search
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      selectedImporter,
      selectedYearState,
      unresolvedOnly = false,
      username,
      selectedBranch = "all",
      selectedCategory = "all"
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-payment-requested-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              importer: selectedImporter?.trim() || "",
              year: selectedYearState || "",
              username: username || "",
              unresolvedOnly: unresolvedOnly.toString(), // ✅ Add unresolvedOnly parameter
              branchId: selectedBranch || "all", // ✅ Add branchId parameter
              category: selectedCategory || "all", // ✅ Add category parameter
            },
          }
        );

        const {
          totalJobs,
          totalPages,
          currentPage: returnedPage,
          jobs,
          unresolvedCount, // ✅ Get unresolved count from response
        } = res.data;

        setRows(jobs);
        setTotalPages(totalPages);
        setTotalJobs(totalJobs);
        setUnresolvedCount(unresolvedCount || 0); // ✅ Update unresolved count
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]);
        setTotalPages(1);
        setUnresolvedCount(0);
      } finally {
        setLoading(false);
      }
    },
    [limit, user?.username]
  );

  // Fetch jobs when dependencies change
  useEffect(() => {
    if (selectedYearState && user?.username) {
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
        showUnresolvedOnly,
        user.username,
        selectedBranch,
        selectedCategory
      );
    }
  }, [
    page,
    debouncedSearchQuery,
    selectedImporter,
    selectedYearState,
    user?.username,
    showUnresolvedOnly,
    fetchJobs,
    selectedBranch,
    selectedCategory,
  ]);

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page on new search
    }, 500); // 500ms delay

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Handle search input change
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Handle copy functionality
  const handleCopy = useCallback((event, text) => {
    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Text copied to clipboard:", text);
        })
        .catch((err) => {
          alert("Failed to copy text to clipboard.");
          console.error("Failed to copy:", err);
        });
    } else {
      // Fallback approach for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard using fallback method:", text);
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  const columns = React.useMemo(
    () => [
      {
        accessorKey: "job_no",
        header: "Job No", muiTableHeadCellProps: { align: "center" }, muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
        enableSorting: false,
        size: 250,
        Cell: ({ cell }) => {
          const {
            job_no,
            year,
            _id,
            type_of_b_e,
            consignment_type,
            custom_house,
            detailed_status,
            vessel_berthing,
            colorPriority,      // ✅ USE THIS FROM BACKEND
            container_nos,
            branch_code,
            trade_type,
            mode,
          } = cell.row.original;

          // Color-coding logic based on job status and dates
          // Color-coding logic - NOW USES BACKEND DATA
          let bgColor = "";
          let textColor = "blue";

          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0); // ✅ MUST normalize time

          // Function to calculate the days difference (MUST MATCH BACKEND)
          const calculateDaysDifference = (targetDate) => {
            if (!targetDate) return null;

            const date = new Date(targetDate);
            date.setHours(0, 0, 0, 0); // ✅ CRITICAL: Normalize time

            const timeDifference = date.getTime() - currentDate.getTime();
            return Math.floor(timeDifference / (1000 * 3600 * 24));
          };

          // ✅ OPTION 1: Use backend colorPriority (RECOMMENDED)
          if (colorPriority) {
            if (colorPriority === 1) {
              bgColor = "red";
              textColor = "white";
            } else if (colorPriority === 2) {
              bgColor = "orange";
              textColor = "black";
            } else if (colorPriority === 3) {
              bgColor = "white";
              textColor = "blue";
            }
          }
          // ✅ OPTION 2: Fallback to frontend calculation (with fixed logic)
          else if (detailed_status === "Billing Pending" && container_nos) {
            let mostCriticalDays = null;

            container_nos.forEach((container) => {
              const targetDate = consignment_type === "LCL"
                ? container.delivery_date
                : container.emptyContainerOffLoadDate;

              if (targetDate) {
                const daysDifference = calculateDaysDifference(targetDate);

                if (mostCriticalDays === null || daysDifference < mostCriticalDays) {
                  mostCriticalDays = daysDifference;
                }
              }
            });

            // Apply colors based on the most critical container
            if (mostCriticalDays !== null && mostCriticalDays < 0) {
              if (mostCriticalDays <= -10) {
                bgColor = "red";
                textColor = "white";
              } else if (mostCriticalDays <= -6) {
                bgColor = "orange";
                textColor = "black";
              } else if (mostCriticalDays <= -1) {
                bgColor = "white";
                textColor = "blue";
              }
            }
          }

          const queryParams = new URLSearchParams({
            selectedJobId: _id,
          }).toString();
          return (
            <Link
              to={`/view-payment-request-job/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?${queryParams}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                cursor: "pointer",
                color: textColor,
                backgroundColor: bgColor || "transparent",
                padding: "10px",
                borderRadius: "5px",
                textAlign: "center",
                textDecoration: "none", whiteSpace: "nowrap",
              }}
            >
              {cell.row.original.job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
              {custom_house}
            </Link>
          );
        },
      },
      {
        accessorKey: "importer",
        header: "Importer",
        enableSorting: false,
        size: 150,
      },

      {
        accessorKey: "container_numbers",
        header: "Container Numbers and Size",
        size: 200,
        Cell: ({ cell }) => {
          const containerNos = cell.row.original.container_nos;
          return (
            <React.Fragment>
              {containerNos?.map((container, id) => (
                <div key={id} style={{ marginBottom: "4px" }}>
                  {container.container_number} <ContainerTrackButton
                    customHouse={cell?.row?.original?.custom_house}
                    containerNo={container.container_number}
                  />
                  | "{container.size}"
                  <IconButton
                    size="small"
                    onClick={(event) =>
                      handleCopy(event, container.container_number)
                    }
                  >
                    <ContentCopyIcon fontSize="inherit" />
                  </IconButton>
                </div>
              ))}
            </React.Fragment>
          );
        },
      },
      {
        accessorKey: "be_no",
        header: "BE Number & Date",
        enableSorting: false,
        size: 150,
        Cell: ({ cell }) => {
          const { be_no, be_date } = cell.row.original;
          return (
            <div>
              {be_no || "-"} <br />
              {be_date ? new Date(be_date).toLocaleDateString("en-GB") : "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "payment_request_nos",
        header: "Payment Request No",
        size: 450,
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const uniqueRequestNos = [...new Set(charges
            .map(c => c.payment_request_no)
            .filter(no => no && no.trim() !== "")
          )];

          return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {uniqueRequestNos.length > 0 ? (
                uniqueRequestNos.map((no, idx) => {
                  // Check if all charges with this request no are Paid
                  const chargesForThisPR = charges.filter(c => c.payment_request_no === no);
                  const isPaid = chargesForThisPR.every(c => c.payment_request_status === "Paid");
                  
                  return (
                    <Chip
                      key={idx}
                      label={no}
                      size="small"
                      color={isPaid ? "success" : "primary"}
                      variant={isPaid ? "filled" : "outlined"}
                      onClick={() => handleViewPaymentRequest(no)}
                      sx={{ 
                        cursor: 'pointer', 
                        fontWeight: 'bold',
                        ...(isPaid ? {
                          backgroundColor: '#2e7d32',
                          color: '#fff',
                        } : {
                          '&:hover': { backgroundColor: '#e3f2fd' }
                        })
                      }}
                    />
                  );
                })
              ) : (
                "-"
              )}
            </Box>
          );
        },
      },
    ],
    [navigate, handleCopy]
  );

  // Table configuration
  const tableConfig = {
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false, // Handled manually via MUI Pagination
    enableBottomToolbar: false,
    enableDensityToggle: false,
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
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
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
        textAlign: "left", // Ensure header content aligns left
      },
    },
    muiTableBodyCellProps: {
      sx: {
        textAlign: "left", // Align all body cell content to the left
      },
    },

    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        {/* Job Count Display */}
        <Typography
          variant="body1"
          sx={{ fontWeight: "bold", fontSize: "1.5rem", marginRight: "auto" }}
        >
          Total Jobs: {totalJobs}
        </Typography>

        <Autocomplete
          sx={{ width: "300px", marginRight: "20px" }}
          freeSolo
          options={importerNames.map((option) => option.label)}
          value={selectedImporter || ""} // Controlled value
          onInputChange={(event, newValue) => setSelectedImporter(newValue)} // Handles input change
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              fullWidth
              label="Select Importer" // Placeholder text
            />
          )}
        />

        <TextField
          select
          size="small"
          value={selectedYearState}
          onChange={(e) => setSelectedYearState(e.target.value)}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          {years.map((year, index) => (
            <MenuItem key={`year-${year}-${index}`} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchInputChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => {
                    setDebouncedSearchQuery(searchQuery);
                    setPage(1);
                  }}
                >
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: "300px", marginRight: "20px", marginLeft: "20px" }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ position: "relative" }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => setShowUnresolvedOnly((prev) => !prev)}
              sx={{
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.875rem",
                padding: "8px 20px",
                background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
                color: "#ffffff",
                border: "none",
                boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
                transition: "all 0.3s ease",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
                  boxShadow: "0 6px 16px rgba(25, 118, 210, 0.4)",
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  transform: "translateY(0px)",
                },
              }}
            >
              {showUnresolvedOnly ? "Show All Jobs" : "Pending Queries"}
            </Button>
            <Badge
              badgeContent={unresolvedCount}
              color="error"
              overlap="circular"
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              sx={{
                position: "absolute",
                top: 4,
                right: 4,
                "& .MuiBadge-badge": {
                  fontSize: "0.75rem",
                  minWidth: "18px",
                  height: "18px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                },
              }}
            />
          </Box>
        </Box>
      </div>
    ),
  };

  return (
    <div style={{ height: "80%" }}>
      <>
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
      </>

      <Dialog
        open={openDetailModal}
        onClose={() => setOpenDetailModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#1a237e', 
          color: 'white', 
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2
        }}>
          <span>PAYMENT REQUEST</span>
          <Chip 
            label={selectedPaymentRequest?.requestNo || "N/A"} 
            size="medium" 
            sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }} 
          />
        </DialogTitle>
        <DialogContent sx={{ p: 0, backgroundColor: '#f8f9fa' }}>
          {isModalLoading ? (
            <Box display="flex" justifyContent="center" p={8}>
              <CircularProgress size={60} />
            </Box>
          ) : selectedPaymentRequest ? (
            <Box id="payment-request-printable" sx={{ p: 4 }}>
              <Paper variant="outlined" sx={{ p: 4, position: 'relative', overflow: 'hidden', backgroundColor: '#fff', borderRadius: 2 }}>
                {/* Status Watermark - Using Logo */}
                <Box 
                  component="img"
                  src={logo}
                  sx={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    opacity: 0.1,
                    width: '60%',
                    pointerEvents: 'none',
                    zIndex: 0,
                    filter: 'grayscale(100%) brightness(1.2)'
                  }}
                />

                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  {/* Header Section */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" color="text.secondary" fontWeight="500">Import Billing Services</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight="bold">Date: {selectedPaymentRequest.requestDate || new Date(selectedPaymentRequest.createdAt).toLocaleDateString('en-GB')}</Typography>
                      <Typography variant="body2" color="text.secondary">Ref: {selectedPaymentRequest.jobNo}</Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 4 }} />

                  {/* Beneficiary Section */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight="bold">Beneficiary Information</Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Beneficiary Name</Typography>
                        <Typography variant="h6" fontWeight="bold">{selectedPaymentRequest.paymentTo || "N/A"}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Against Bill / Reference</Typography>
                        <Typography variant="body1">{selectedPaymentRequest.againstBill || "-"}</Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Charge Grid Attachments Section (Moved Up) */}
                  {selectedPaymentRequest.attachments && selectedPaymentRequest.attachments.length > 0 && (
                    <Box sx={{ mb: 4, p: 2, borderRadius: 2, backgroundColor: '#e3f2fd', border: '1px solid #bbdefb' }}>
                      <Typography variant="overline" color="primary" fontWeight="bold" mb={1} display="block">
                        Attached Documents from Charge Grid
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                        {selectedPaymentRequest.attachments.map((url, index) => (
                          <Button
                            key={index}
                            variant="contained"
                            size="small"
                            startIcon={<AttachFileIcon />}
                            endIcon={<OpenInNewIcon />}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ 
                              textTransform: 'none', 
                              borderRadius: '20px',
                              boxShadow: 'none',
                              '&:hover': { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }
                            }}
                          >
                            View Attachment {selectedPaymentRequest.attachments.length > 1 ? index + 1 : ""}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Financial Section */}
                  <Box sx={{ mb: 4, p: 3, backgroundColor: '#f1f3f4', borderRadius: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Requested Amount</Typography>
                        <Typography variant="h4" color="primary" fontWeight="bold">
                          ₹ {selectedPaymentRequest.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Transaction</Typography>
                            <Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.transactionType || "NEFT"}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Transfer Mode</Typography>
                            <Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.transferMode || "Online"}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Bank Details Section */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight="bold">Bank Details</Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle2" color="text.secondary">Bank Name</Typography>
                        <Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.bankName || "N/A"}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle2" color="text.secondary">Account Number</Typography>
                        <Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.accountNo || "N/A"}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle2" color="text.secondary">IFSC Code</Typography>
                        <Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.ifscCode || "N/A"}</Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {(selectedPaymentRequest.status === 'Paid' || selectedPaymentRequest.utrNumber) ? (
                    <>
                      <Divider sx={{ mb: 3 }} />
                      <Box>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold">Payment Confirmation</Typography>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="subtitle2" color="text.secondary">UTR Number</Typography>
                            <Typography variant="body1" fontWeight="bold" color="success.main">
                              {selectedPaymentRequest.utrNumber || selectedPaymentRequest.instrumentNo || "-"}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="subtitle2" color="text.secondary">Added By</Typography>
                            <Typography variant="body1">{selectedPaymentRequest.utrAddedBy || "Accounts Team"}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="subtitle2" color="text.secondary">Added On</Typography>
                            <Typography variant="body1">
                              {selectedPaymentRequest.utrAddedAt 
                                ? new Date(selectedPaymentRequest.utrAddedAt).toLocaleString('en-GB') 
                                : selectedPaymentRequest.instrumentDate || "-"}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Divider sx={{ mb: 3 }} />
                      <Box sx={{ p: 2, border: '1px dashed #ced4da', borderRadius: 2, backgroundColor: '#fff9c4' }}>
                        <Typography variant="subtitle2" color="warning.main" fontWeight="bold" mb={1}>Account Action: Enter UTR to Mark as Paid</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TextField
                            size="small"
                            label="Enter UTR Number"
                            variant="outlined"
                            fullWidth
                            value={utrInput}
                            onChange={(e) => setUtrInput(e.target.value)}
                            sx={{ backgroundColor: '#fff' }}
                          />
                          <Button 
                            variant="contained" 
                            color="success" 
                            disabled={!utrInput.trim() || isSubmittingUtr}
                            onClick={handleUpdateUTR}
                            sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}
                          >
                            {isSubmittingUtr ? <CircularProgress size={24} color="inherit" /> : "Mark Paid"}
                          </Button>
                        </Box>
                      </Box>
                    </>
                  )}

                </Box>
              </Paper>
            </Box>
          ) : (
            <Box p={8} textAlign="center">
              <Typography color="error" variant="h6">Failed to load payment request details.</Typography>
              <Typography color="text.secondary">Please try again after some time.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, backgroundColor: '#e9ecef', borderTop: '1px solid #dee2e6' }}>
          <Button 
            onClick={() => window.print()}
            startIcon={<ContentCopyIcon />}
            variant="outlined" 
            sx={{ fontWeight: 'bold' }}
          >
            Download / Print
          </Button>
          <Button 
            onClick={() => setOpenDetailModal(false)} 
            variant="contained" 
            color="primary"
            sx={{ fontWeight: 'bold', px: 4 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default PaymentRequested;
