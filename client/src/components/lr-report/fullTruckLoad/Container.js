import React, { useMemo } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import LrTable from "./LrTable";
import { IconButton, Button } from "@mui/material";
import TableRowsIcon from "@mui/icons-material/TableRows";
import Pagination from "@mui/material/Pagination";
import usePrColumns from "../../../customHooks/usePrColumns";
import usePrData from "../../../customHooks/usePrData";

function Container() {
  const { organisations, containerTypes, locations, truckTypes } = usePrData();

  const {
    rows,
    setRows,
    columns,
    total,
    totalPages,
    currentPage,
    handlePageChange,
    refreshPrData,
  } = usePrColumns(organisations, containerTypes, locations, truckTypes);

  // Memoize table instance
  const table = useMaterialReactTable({
    columns,
    data: rows,
    getRowId: (row) => row.idno,
    enableColumnResizing: true,
    enableDensityToggle: false,
    initialState: {
      density: "compact",
    },
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    enablePinning: true,
    enableExpandAll: false,
    enablePagination: false,
    // Add row virtualization
    enableRowVirtualization: true,
    // Limit detail panel to prevent excessive rendering
    enableExpanding: true,
    maxLeafRowFilterCount: 50,
    muiTableContainerProps: {
      sx: {
        maxHeight: "600px",
        overflowY: "auto",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
    // Memoize detail panel render
    renderDetailPanel: useMemo(
      () =>
        ({ row }) =>
          (
            <div style={{ padding: "0 !important" }}>
              <LrTable
                page={currentPage}
                pr_no={row.original.pr_no}
                locations={locations}
                truckTypes={truckTypes}
                prData={rows[row.id]}
                onDelete={() => refreshPrData(currentPage)}
              />
            </div>
          ),
      [currentPage, locations, truckTypes, rows, refreshPrData]
    ),
    renderTopToolbarCustomActions: () => (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddRow}
          style={{
            fontWeight: "bold",
            textTransform: "none",
            borderRadius: "8px",
            padding: "6px 16px",
            fontSize: "0.9rem",
          }}
        >
          Add PR
        </Button>
        <div
          style={{
            padding: "4px 8px",
            borderRadius: "4px",
            backgroundColor: "#f5f5f5",
            fontSize: "0.875rem",
            fontWeight: "bold",
          }}
        >
          Total Records: {total}
        </div>
      </div>
    ),
  });

  // Memoize add row handler
  const handleAddRow = useMemo(
    () => () => {
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
        idno: Date.now(),
      };

      setRows((prevRows) => [newRow, ...prevRows]);
    },
    [setRows]
  );

  return (
    <div style={{ width: "100% !important" }}>
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

export default React.memo(Container);
