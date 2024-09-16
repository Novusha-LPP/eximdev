import React, { useContext, useState } from "react";
import "../../styles/job-list.scss";
import useJobColumns from "../../customHooks/useJobColumns";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname";
import useFetchJobList from "../../customHooks/useFetchJobList";
import { detailedStatusOptions } from "../../assets/data/detailedStatusOptions";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";
import { MenuItem, TextField, IconButton } from "@mui/material";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DownloadIcon from "@mui/icons-material/Download";
import SelectImporterModal from "./SelectImporterModal";
import { useNavigate } from "react-router-dom";

function JobList(props) {
  const [years, setYears] = React.useState([]);
  const { selectedYear, setSelectedYear } = useContext(SelectedYearContext);
  const [detailedStatus, setDetailedStatus] = useState("all");
  const columns = useJobColumns(detailedStatus);
  const { rows } = useFetchJobList(detailedStatus, selectedYear, props.status);

  // Select importer modal
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    async function getYears() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-years`
      );
      const filteredYears = res.data.filter((year) => year !== null);
      setYears(filteredYears);
      setSelectedYear(filteredYears[0]);
    }
    getYears();
  }, []);

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false, // Disable density toggle
    initialState: { density: "compact", columnPinning: { left: ["job_no"] } }, // Set initial table density to compact
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enableStickyHeader: true, // Enable sticky header
    enablePinning: true, // Enable pinning for sticky columns
    muiTableContainerProps: {
      sx: { maxHeight: "590px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
      // onClick: () =>
      //   navigate(`/job/${row.original.job_no}/${row.original.year}`), // Navigate on row click
      // style: { cursor: "pointer" }, // Change cursor to pointer on hover
    }),
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },

    renderTopToolbarCustomActions: () => (
      <>
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
          <TextField
            select
            size="small"
            margin="normal"
            variant="outlined"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            sx={{ width: "200px", margin: 0, marginRight: "20px" }}
          >
            {years?.map((year) => {
              return (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              );
            })}
          </TextField>
          <TextField
            select
            size="small"
            sx={{ width: "300px" }}
            value={detailedStatus}
            onChange={(e) => {
              setDetailedStatus(e.target.value);
            }}
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
      </>
    ),
  });

  return (
    <div className="table-container">
      <MaterialReactTable table={table} />
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
