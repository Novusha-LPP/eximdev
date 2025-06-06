import React, { useMemo } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { IconButton } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { generateLrPdf } from "../../../utils/generateLrPdf";
import useLrColumns from "../../../customHooks/useLrColumns";
import LocationDialog from "../../srcel/LocationDialog";

function LrTable(props) {
  const {
    rows,
    columns,
    selectedRows,
    openLocationDialog,
    handleCloseLocationDialog,
    locationData,
  } = useLrColumns(props);

  // Memoize table instance
  const table = useMaterialReactTable({
    columns,
    data: rows,
    initialState: {
      density: "compact",
    },
    enableColumnFilters: false,
    enableColumnActions: false,
    enableTopToolbar: false,
    // Add row virtualization
    enableRowVirtualization: true,
    muiTableContainerProps: {
      sx: { maxHeight: "400px" }, // Limit height for better performance
    },
    renderBottomToolbar: () => (
      <IconButton onClick={() => generateLrPdf(selectedRows, props.prData)}>
        <PrintIcon />
      </IconButton>
    ),
  });

  return (
    <>
      <MaterialReactTable table={table} />
      <LocationDialog
        open={openLocationDialog}
        onClose={handleCloseLocationDialog}
        locationData={locationData}
      />
    </>
  );
}

export default React.memo(LrTable);
