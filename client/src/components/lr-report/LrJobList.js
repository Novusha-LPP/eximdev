import React, { useContext, useState, useEffect } from "react";
import "../../styles/job-list.scss";
import useJobColumns from "../../customHooks/useLrJobColumns.js";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname";
import useFetchLrJobList from "../../customHooks/useFetchLrJobList.js";
import { detailedStatusOptions } from "../../assets/data/detailedStatusOptions";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";
import {
  MenuItem,
  TextField,
  IconButton,
  Typography,
  Pagination,
  Autocomplete,
  InputAdornment,
  Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DownloadIcon from "@mui/icons-material/Download";
// import SelectImporterModal from "./SelectImporterModal";
import { useImportersContext } from "../../contexts/importersContext";
import { YearContext } from "../../contexts/yearContext.js";
import { useNavigate } from "react-router-dom";

function LrJobList(props) {
  const [years, setYears] = useState([]);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [detailedStatus, setDetailedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const columns = useJobColumns(detailedStatus);
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState("");

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();

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
  // Function to build the search query (not needed on client-side, handled by server)
  // Keeping it in case you want to extend client-side filtering

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

  // useEffect(() => {
  //   if (!selectedImporter) {
  //     setSelectedImporter("Select Importer");
  //   }
  // }, [importerNames]);

  const { rows, total, totalPages, currentPage, handlePageChange, fetchJobs } =
    useFetchLrJobList(
      detailedStatus,
      selectedYearState,
      props.status,
      debouncedSearchQuery,
      selectedImporter
    );

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
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const table = useMaterialReactTable({
    columns,
    data: rows.map((row, index) => ({ ...row, id: row._id || `row-${index}` })),
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
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
      sx: { maxHeight: "590px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
      sx: { textAlign: "center" },
    }),
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
          sx={{ fontWeight: "bold", fontSize: "1.5rem" }}
        >
          {props.status} Jobs: {total}
        </Typography>

        {/* <Autocomplete
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
        /> */}

        {/* <TextField
          select
          defaultValue={years[0]}
          size="small"
          value={selectedYearState}
          onChange={(e) => setSelectedYearState(e.target.value)}
          sx={{ width: "100px", marginRight: "20px" }}
        >
          {years.map((year, index) => (
            <MenuItem key={`year-${year}-${index}`} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField> */}

        {/* <TextField
          select
          size="small"
          value={detailedStatus}
          onChange={(e) => setDetailedStatus(e.target.value)}
          sx={{ width: "300px" }}
        >
          {detailedStatusOptions.map((option, index) => (
            <MenuItem
              key={`status-${option.id || option.value || index}`}
              value={option.value}
            >
              {option.name}
            </MenuItem>
          ))}
        </TextField> */}

        {/* <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => fetchJobs(1)}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: "300px", marginRight: "20px" }}
        /> */}
        {/* <IconButton onClick={handleOpen}>
          <DownloadIcon />
        </IconButton> */}
      </div>
    ),
  });

  return (
    <div className="table-container">
      <MaterialReactTable table={table} />

      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={(event, page) => handlePageChange(page)}
        color="primary"
        sx={{ mt: 2, display: "flex", justifyContent: "center" }}
      />
      {/* 
      <SelectImporterModal
        open={open}
        handleClose={handleClose}
        status={props.status}
        detailedStatus={detailedStatus}
      /> */}
    </div>
  );
}

export default React.memo(LrJobList);
