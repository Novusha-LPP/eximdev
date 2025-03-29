import React, { useContext, useState, useEffect } from "react";
import "../../styles/job-list.scss";
import useJobColumns from "../../customHooks/useJobColumns";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname";
import useFetchJobList from "../../customHooks/useFetchJobList";
import { detailedStatusOptions } from "../../assets/data/detailedStatusOptions";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";
import {
  MenuItem,
  TextField,
  IconButton,
  Typography,
  Pagination,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DownloadIcon from "@mui/icons-material/Download";
import SelectImporterModal from "./CSelectImporterModal";
import { useNavigate } from "react-router-dom";
import { useImportersContext } from "../../contexts/importersContext";

function CJobList(props) {
  const [years, setYears] = useState([]);
  const { selectedYear, setSelectedYear } = useContext(SelectedYearContext);
  const [detailedStatus, setDetailedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const columns = useJobColumns(detailedStatus);
  const { importers } = useImportersContext();
  const [userData, setUserData] = useState(null);
  const [username, setUsername] = useState(null);
  const [selectedImporter, setSelectedImporter] = useState(null);

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("exim_user");

    try {
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUsername(parsedUser.username);

        if (
          parsedUser.assigned_importer_name &&
          parsedUser.assigned_importer_name.length > 0
        ) {
          setSelectedImporter(parsedUser.assigned_importer_name[0]);
        }
      }
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      setUserData(null);
      setSelectedImporter(null);
    }
  }, []);

  // Fetch user data on component mount
  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-user-data/${username}`
        );

        setUserData(response.data);

        // Set default selected importer from user data
        if (
          response.data.assigned_importer_name &&
          response.data.assigned_importer_name.length > 0
        ) {
          setSelectedImporter(response.data.assigned_importer_name[0]);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }
    fetchUserData();
  }, []);

  const { rows, total, totalPages, currentPage, handlePageChange, fetchJobs } =
    useFetchJobList(
      detailedStatus,
      selectedYear,
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

        if (!selectedYear && filteredYears.length > 0) {
          setSelectedYear(
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
  }, [selectedYear, setSelectedYear]);

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

        <TextField
          select
          defaultValue={years[0]}
          size="small"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          sx={{ width: "100px", marginRight: "20px" }}
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
        </TextField>

        <TextField
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
        />
        <IconButton onClick={handleOpen}>
          <DownloadIcon />
        </IconButton>
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

      <SelectImporterModal
        open={open}
        handleClose={handleClose}
        status={props.status}
        detailedStatus={detailedStatus}
      />
    </div>
  );
}

export default React.memo(CJobList);
