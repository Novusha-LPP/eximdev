import React from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { IconButton } from "@mui/material";
import TableRowsIcon from "@mui/icons-material/TableRows";
import PrintIcon from "@mui/icons-material/Print";
import { generateLrPdf } from "../../../utils/generateLrPdf";
import useLrColumns from "../../../customHooks/useLrColumns";
import LocationDialog from "../../srcel/LocationDialog";

function LrTable(props) {
  const {
    rows,
    setRows,
    columns,
    selectedRows,
    openLocationDialog,
    handleCloseLocationDialog,
    locationData,
  } = useLrColumns(props);

  const table = useMaterialReactTable({
    columns,
    data: rows,
    initialState: {
      density: "compact",
    }, // Set initial table density to compact
    enableColumnFilters: false,
    enableColumnActions: false,
    enableTopToolbar: false,
    renderBottomToolbar: ({ table }) => (
      <>
        <IconButton onClick={handleAddRow}>
          <TableRowsIcon />
        </IconButton>
        <IconButton onClick={() => generateLrPdf(selectedRows, props.prData)}>
          <PrintIcon />
        </IconButton>
      </>
    ),
  });

  const handleAddRow = () => {
    setRows((prevRows) => [
      ...prevRows,
      {
        tr_no: "",
        container_number: "",
        seal_no: "",
        gross_weight: "",
        tare_weight: "",
        net_weight: "",
        goods_pickup: "",
        goods_delivery: "",
        own_hired: "",
        type_of_vehicle: "",
        vehicle_no: "",
        driver_name: "",
        driver_phone: "",
        instructions: "",
        document_no: "",
        document_date: "",
        containers: [],
      },
    ]);
  };

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

export default LrTable;
