import React from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import LrTable from "./LrTable";
import { IconButton } from "@mui/material";
import TableRowsIcon from "@mui/icons-material/TableRows";
import Pagination from "@mui/material/Pagination"; // Import Pagination
import usePrColumns from "../../../customHooks/usePrColumns";
import usePrData from "../../../customHooks/usePrData";

function Container() {
  const { organisations, containerTypes, locations, truckTypes } = usePrData();

  const { rows, setRows, columns, totalPages, currentPage, handlePageChange } =
    usePrColumns(organisations, containerTypes, locations, truckTypes);

  const table = useMaterialReactTable({
    columns,
    data: rows,
    getRowId: (row) => row.idno, // Use idno as the unique key for each row
    enableColumnResizing: true,
    enableDensityToggle: false, // Disable density toggle
    initialState: {
      density: "compact",
    }, // Set initial table density to compact
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enableStickyHeader: true, // Enable sticky header
    enablePinning: true, // Enable pinning for sticky columns
    enableExpandAll: false,
    enablePagination: false,
    muiTableContainerProps: {
      sx: { maxHeight: "600px", overflowY: "auto" },
    },
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
    renderDetailPanel: ({ row }) => {
      return (
        <div style={{ padding: "0 !important" }}>
          <LrTable
            pr_no={row.original.pr_no}
            locations={locations}
            truckTypes={truckTypes}
            prData={rows[row.id]}
          />
        </div>
      );
    },

    renderBottomToolbarCustomActions: ({ table }) => (
      <IconButton onClick={handleAddRow}>
        <TableRowsIcon />
      </IconButton>
    ),
  });

  const handleAddRow = () => {
    const newRow = {
      pr_no: "",
      pr_date: "",
      branch: "",
      consignor: "",
      consignee: "",
      container_type: "",
      container_count: "",
      type_of_vehicle: "",
      description: "",
      shipping_line: "",
      container_loading: "",
      container_offloading: "",
      do_validity: "",
      instructions: "",
      document_no: "",
      document_date: "",
      goods_pickup: "",
      goods_delivery: "",
      containers: [],
      import_export: "",
      idno: Date.now(), // Generate a unique id
    };

    setRows((prevRows) => [newRow, ...prevRows]);
  };

  return (
    <div style={{ width: "100% !important" }}>
      <br />
      <MaterialReactTable table={table} />
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={(event, page) => handlePageChange(page)}
        color="primary"
        sx={{ mt: 2, display: "flex", justifyContent: "center" }}
      />
      
    </div>
  );
}

export default Container;
