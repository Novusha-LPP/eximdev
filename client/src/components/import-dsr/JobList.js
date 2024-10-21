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
} from "@mui/material";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DownloadIcon from "@mui/icons-material/Download";
import SelectImporterModal from "./SelectImporterModal";
import { useNavigate } from "react-router-dom";

function JobList(props) {
  const [years, setYears] = useState([]);
  const { selectedYear, setSelectedYear } = useContext(SelectedYearContext);

  const [detailedStatus, setDetailedStatus] = useState("all"); // Default status
  const columns = useJobColumns(detailedStatus);

  const { rows, total, totalPages, currentPage, loading, handlePageChange } =
    useFetchJobList(detailedStatus, selectedYear, props.status);

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function getYears() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-years`
      );
      const filteredYears = res.data.filter((year) => year !== null);
      setYears(filteredYears);
      setSelectedYear(filteredYears[0]);
    }
    getYears();
  }, [setSelectedYear]);

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false, // Disable built-in pagination
    enableBottomToolbar: false,
    enableDensityToggle: false,
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
      showGlobalFilter: true,
    },
    enableGlobalFilter: true,
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
        gap={1}
        width="100%"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          flex: 1,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            display: "inline-block",
            marginRight: "20px",
            fontWeight: "bold",
            fontStyle: "italic",
            fontSize: "1.5rem",
          }}
        >
          {props.status} jobs: {total}
        </Typography>

        <TextField
          select
          size="small"
          margin="normal"
          variant="outlined"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          sx={{ width: "200px", margin: 0, marginRight: "20px" }}
        >
          {years?.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          sx={{ width: "300px" }}
          value={detailedStatus}
          onChange={(e) => setDetailedStatus(e.target.value)}
        >
          {detailedStatusOptions?.map((option) => (
            <MenuItem key={option.id} value={option.value}>
              {option.name}
            </MenuItem>
          ))}
        </TextField>

        <IconButton onClick={handleOpen}>
          <DownloadIcon />
        </IconButton>
      </div>
    ),
  });

  return (
    <div className="table-container">
      <MaterialReactTable table={table} />

      {/* Pagination Component */}
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={(event, page) => handlePageChange(page)}
        color="primary"
        sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
      />

      <SelectImporterModal
        open={open}
        handleOpen={handleOpen}
        handleClose={handleClose}
        status={props.status}
        detailedStatus={detailedStatus}
      />
    </div>
  );
}

export default React.memo(JobList);
