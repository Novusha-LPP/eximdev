import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DoPlanningContainerTable from "./DoPlanningContainerTable";
import { useNavigate, useLocation, Link } from "react-router-dom";
import BLTrackingCell from "../../customHooks/BLTrackingCell";

import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
  Button,
  Box,
  Badge,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { getTableRowInlineStyle } from "../../utils/getTableRowsClassname";
import { BranchContext } from "../../contexts/BranchContext.js";
import useDynamicICDs from "../../customHooks/useDynamicICDs";

import ContainerTrackButton from '../ContainerTrackButton';

function AllJobsList() {
  const [selectedICD, setSelectedICD] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [years, setYears] = useState([]);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [importers, setImporters] = useState(null);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const {
    searchQuery,
    setSearchQuery,
    selectedImporter,
    setSelectedImporter,
    currentPageDoTabAll: currentPage,
    setCurrentPageDoTabAll: setCurrentPage,
  } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const navigate = useNavigate();
  const location = useLocation();
  const [totalJobs, setTotalJobs] = useState(0);
  const limit = 100;
  const [selectedJobId, setSelectedJobId] = useState(
    location.state?.selectedJobId || null
  );
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);
  const { branches, selectedBranch, selectedCategory } = useContext(BranchContext);
  const activeBranchConfig = branches.find(b => b._id === selectedBranch)?.configuration || { railout_enabled: true, gateway_igm_enabled: true, gateway_igm_date_enabled: true };
  const dynamicICDs = useDynamicICDs();

  React.useEffect(() => {
    if (location.state?.fromJobDetails) {
      if (location.state?.searchQuery !== undefined) {
        setSearchQuery(location.state.searchQuery);
      }
      if (location.state?.selectedImporter !== undefined) {
        setSelectedImporter(location.state.selectedImporter);
      }
      if (location.state?.selectedJobId !== undefined) {
        setSelectedJobId(location.state.selectedJobId);
      }
      if (location.state?.currentPage !== undefined) {
        setCurrentPage(location.state.currentPage);
      }
    } else {
      setSelectedJobId(null);
    }
  }, [setSearchQuery, setSelectedImporter, setCurrentPage, location.state]);

  const formatDate = useCallback((dateStr) => {
    if (dateStr) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}/${month}/${day}`;
    }
    return dateStr;
  }, []);

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
          const newYear = filteredYears.includes(defaultYearPair)
            ? defaultYearPair
            : filteredYears[0];
          setSelectedYearState(newYear);
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, [selectedYearState, setSelectedYearState]);

  const handleCopy = (event, text) => {
    event.stopPropagation();
    if (!text || text === "N/A") return;
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => console.log("Copied:", text))
        .catch((err) => console.error("Copy failed:", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Copied (fallback):", text);
      } catch (err) {
        console.error("Fallback failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      currentYear,
      currentICD,
      selectedImporter,
      unresolvedOnly = false,
      selectedBranch = "all",
      selectedCategory = "all"
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-all-do-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              year: currentYear,
              selectedICD: currentICD,
              importer: selectedImporter?.trim() || "",
              username: user?.username || "",
              unresolvedOnly: unresolvedOnly.toString(),
              branchId: selectedBranch || "all",
              category: selectedCategory || "all",
            },
          }
        );

        const {
          totalJobs,
          totalPages,
          jobs,
          unresolvedCount,
        } = res.data;
        setRows(jobs);
        setTotalPages(totalPages);
        setTotalJobs(totalJobs);
        setUnresolvedCount(unresolvedCount || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [limit, user?.username]
  );

  useEffect(() => {
    if (selectedYearState && user?.username) {
      fetchJobs(
        currentPage,
        debouncedSearchQuery,
        selectedYearState,
        selectedICD,
        selectedImporter,
        showUnresolvedOnly,
        selectedBranch,
        selectedCategory
      );
    }
  }, [
    currentPage,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    selectedImporter,
    user?.username,
    showUnresolvedOnly,
    selectedBranch,
    selectedCategory,
    fetchJobs,
  ]);

  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
      enableSorting: false,
      size: 250,
      Cell: ({ cell }) => {
        const {
          job_no,
          year,
          type_of_b_e,
          consignment_type,
          _id,
          custom_house,
          mode,
          branch_code,
          trade_type,
          do_completed,
        } = cell.row.original;

        const textColor = "blue";
        const isSelected = selectedJobId === _id;
        const isDoCompleted = do_completed && do_completed !== "";

        const routePath = isDoCompleted
          ? `/edit-do-completed/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?jobId=${_id}`
          : `/edit-do-list/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?jobId=${_id}`;

        const bgColor =
          cell.row.original.priorityJob === "High Priority"
            ? "orange"
            : cell.row.original.priorityJob === "Priority"
              ? "yellow"
              : "transparent";

        return (
          <Link
            to={routePath}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSelectedJobId(_id)}
            style={{
              backgroundColor: isSelected ? "#ffffcc" : bgColor,
              textAlign: "center",
              cursor: "pointer",
              color: textColor,
              display: "inline-block",
              width: "100%",
              padding: "5px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {cell.row.original.job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />
            {custom_house}
          </Link>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Importer",
      enableSorting: false,
      size: 250,
      Cell: ({ cell, row }) => {
        const importerName = cell?.getValue()?.toString();
        const doShippingLineInvoice = row.original.do_shipping_line_invoice;
        let paymentReciptDate = "";
        let paymentRequestDate = "";
        if (
          Array.isArray(doShippingLineInvoice) &&
          doShippingLineInvoice.length > 0
        ) {
          paymentReciptDate = doShippingLineInvoice[0].payment_recipt_date;
          paymentRequestDate = doShippingLineInvoice[0].payment_request_date;
        }
        return (
          <React.Fragment>
            {importerName}
            <IconButton
              size="small"
              onPointerOver={(e) => (e.target.style.cursor = "pointer")}
              onClick={(event) => {
                handleCopy(event, importerName);
              }}
            >
              <abbr title="Copy Party Name">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            {paymentRequestDate && (
              <div
                style={{
                  color: "#d32f2f",
                  fontWeight: 500,
                  fontSize: "12px",
                  marginTop: 4,
                }}
              >
                Payment request sent to billing team
              </div>
            )}
            {paymentReciptDate && (
              <div
                style={{ fontSize: "11px", color: "#1976d2", marginTop: "2px" }}
              >
                Payment Receipt Uploaded:{" "}
                {new Date(paymentReciptDate).toLocaleString("en-IN", {
                  hour12: true,
                })}
              </div>
            )}
            <br />
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "be_no_igm_details",
      header: "Bill Of Entry & IGM Details",
      enableSorting: false,
      size: 300,
      Cell: ({ cell }) => {
        const {
          be_no,
          igm_date,
          igm_no,
          be_date,
          gateway_igm_date,
          gateway_igm,
        } = cell.row.original;

        return (
          <div>
            <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
              <strong>BE No:</strong> {be_no || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, be_no)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy BE No">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
              <strong>BE Date:</strong> {be_date || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, be_date)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy BE Date">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            {activeBranchConfig.gateway_igm_enabled && (
              <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
                <strong>GIGM:</strong> {gateway_igm || "N/A"}{" "}
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, gateway_igm)}
                  sx={{ padding: "2px", marginLeft: "4px" }}
                >
                  <abbr title="Copy GIGM">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              </div>
            )}

            {activeBranchConfig.gateway_igm_date_enabled && (
              <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
                <strong>GIGM Date:</strong> {gateway_igm_date || "N/A"}{" "}
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, gateway_igm_date)}
                  sx={{ padding: "2px", marginLeft: "4px" }}
                >
                  <abbr title="Copy GIGM Date">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              </div>
            )}

            <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
              <strong>IGM No:</strong> {igm_no || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, igm_no)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy IGM No">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
              <strong>IGM Date:</strong> {igm_date || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, igm_date)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy IGM Date">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      size: 200,
      Cell: ({ row }) => {
        const vesselFlight = row.original.vessel_flight?.toString() || "N/A";
        const voyageNo = row.original.voyage_no?.toString() || "N/A";
        const line_no = row.original.line_no || "N/A";

        return (
          <React.Fragment>
            <BLTrackingCell
              blNumber={row.original.awb_bl_no}
              hblNumber={row.original?.hawb_hbl_no?.toString() || ""}
              shippingLine={row.original.shipping_line_airline}
              customHouse={row.original?.custom_house || ""}
              container_nos={row.original.container_nos}
              jobId={row.original._id}
              portOfReporting={row.original.port_of_reporting}
              containerNos={row.original.container_nos}
              onCopy={handleCopy}
            />

            <div>
              {vesselFlight}
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, vesselFlight)}
              >
                <abbr title="Copy Vessel">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div>
              {`Vessel Voyage: ${voyageNo}`}
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, voyageNo)}
              >
                <abbr title="Copy Voyage Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div>
              {`Line No: ${line_no}`}
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, line_no)}
              >
                <abbr title="Copy Line No Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "free_time",
      header: "Free Time",
      size: 100,
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
                <a
                  href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {container.container_number}
                </a>
                <ContainerTrackButton
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
                  <abbr title="Copy Container Number">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              </div>
            ))}
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "displayDate",
      header: "Required Do Validity Upto",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        const displayDate = cell.getValue();
        const dayDifference = row.original.dayDifference;
        const typeOfDo = row.original.type_of_Do;
        const do_list = row.original.do_list;
        return (
          <div
            style={{
              backgroundColor: dayDifference > 0 ? "#FFCCCC" : "#CCFFCC",
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            {displayDate}{" "}
            {dayDifference > 0 && <div>(+{dayDifference} days)</div>}
            <div>Type Of Do: {typeOfDo}</div>
            <strong> EmptyOff LOC:</strong> {do_list}
          </div>
        );
      },
    },
    {
      accessorKey: "do_revalidation_upto",
      header: "DO Revalidation Upto",
      size: 180,
      Cell: ({ cell }) => {
        const containers = cell.row.original.container_nos || [];
        return (
          <React.Fragment>
            {containers.map((container, containerIndex) => {
              const revalidationData = container.do_revalidation || [];
              return (
                <div
                  key={container.container_number}
                  style={{ marginBottom: "8px" }}
                >
                  {revalidationData.length === 0 ? (
                    <div></div>
                  ) : (
                    revalidationData.map((item, index) => (
                      <div key={item._id} style={{ marginBottom: "4px" }}>
                        {containerIndex + 1}.{index + 1}.{" "}
                        {item.do_revalidation_upto || "N/A"}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "Doc",
      header: "Do Completed & Validity Date",
      enableSorting: false,
      size: 200,
      Cell: ({ cell }) => {
        const { do_completed, do_validity, cth_documents } = cell.row.original;
        const doCompleted = formatDate(do_completed);
        const doValidity = formatDate(do_validity);

        return (
          <div style={{ textAlign: "left" }}>
            {cth_documents &&
              cth_documents.some(
                (doc) =>
                  doc.url &&
                  doc.url.length > 0 &&
                  doc.document_name === "Bill of Lading"
              ) ? (
              cth_documents
                .filter(
                  (doc) =>
                    doc.url &&
                    doc.url.length > 0 &&
                    doc.document_name === "Bill of Lading"
                )
                .map((doc) => (
                  <div key={doc._id} style={{ marginBottom: "5px" }}>
                    <a
                      href={doc.url[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "blue",
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      {doc.document_name}
                    </a>
                  </div>
                ))
            ) : (
              <span style={{ color: "gray" }}>No Bill of Lading </span>
            )}

            <div>
              {doCompleted ? (
                <strong>DO Completed Date: {doCompleted}</strong>
              ) : (
                <span style={{ color: "red" }}>DO Completed Pending</span>
              )}
            </div>
            <div>
              {doValidity ? (
                <strong>DO Validity Date: {doValidity}</strong>
              ) : (
                <span>DO Validity Date: N/A</span>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    },
    enableGrouping: true,
    enableGlobalFilter: false,
    enableColumnFilters: false,
    enableColumnActions: false,
    enablePagination: false,
    enableStickyHeader: true,
    enablePinning: true,
    enableBottomToolbar: false,
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => {
      const status = row.original.payment_made;
      const isPaymentMade = status !== "No" && status !== undefined;
      return {
        className: isPaymentMade ? "payment_made" : "",
        style: getTableRowInlineStyle(row),
      };
    },
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Typography
          variant="body1"
          sx={{ fontWeight: "bold", fontSize: "1.5rem", marginRight: "auto" }}
        >
          Job Count: {totalJobs}
        </Typography>{" "}
        <Autocomplete
          sx={{ width: "300px", marginRight: "20px" }}
          freeSolo
          options={importerNames.map((option) => option.label)}
          value={selectedImporter || ""}
          onInputChange={(event, newValue) => {
            setSelectedImporter(newValue);
            setCurrentPage(1);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              fullWidth
              label="Select Importer"
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
          select
          size="small"
          variant="outlined"
          label="ICD Code"
          value={selectedICD}
          onChange={(e) => {
            setSelectedICD(e.target.value);
            setCurrentPage(1);
          }}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          <MenuItem value="">All ICDs</MenuItem>
          {dynamicICDs.map((icd, index) => (
            <MenuItem key={index} value={icd}>{icd}</MenuItem>
          ))}
        </TextField>{" "}
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
                    setCurrentPage(1);
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
  });

  return (
    <div style={{ height: "80%" }}>
      {loading ? (
        <Typography variant="body1" sx={{ textAlign: "center", p: 4 }}>
          Loading Jobs...
        </Typography>
      ) : (
        <MaterialReactTable table={table} />
      )}
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        color="primary"
        sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
      />
    </div>
  );
}

export default React.memo(AllJobsList);
