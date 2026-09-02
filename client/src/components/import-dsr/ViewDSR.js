import React, { useContext, useState } from "react";
import "../../styles/job-list.scss";
import { getTableRowsClassname, getTableRowInlineStyle } from "../../utils/getTableRowsClassname";
import useFetchDSR from "../../customHooks/useFetchDSR";
import { detailedStatusOptions } from "../../assets/data/detailedStatusOptions";
import { YearContext } from "../../contexts/yearContext";
import { MenuItem, TextField, IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { isAirMode } from "../../utils/modeLogic";

function ViewDSR() {
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [detailedStatus, setDetailedStatus] = useState("all");
  const { rows } = useFetchDSR(detailedStatus, selectedYearState);

  const handleCopy = (event, text) => {
    event.stopPropagation();
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).catch((err) => console.error("Copy failed:", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job Number",
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
      enableSorting: false,
      size: 140,
      Cell: ({ cell, row }) => {
        const jobNo = cell.getValue();
        const jobNumber = row.original.job_number || jobNo;
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
            <span>{jobNumber}</span>
            <IconButton
              size="small"
              onClick={(e) => handleCopy(e, jobNumber)}
              sx={{ p: 0.2 }}
              title="Copy Job Number"
            >
              <ContentCopyIcon sx={{ fontSize: "14px", color: "#64748b" }} />
            </IconButton>
          </div>
        );
      },
    },
    {
      accessorKey: "job_date",
      header: "Job Date",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "supplier_exporter",
      header: "Supplier/Exporter",
      enableSorting: false,
      size: 300,
    },
    {
      accessorKey: "invoice_number",
      header: "Invoice Number",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "invoice_date",
      header: "Invoice Date",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL No",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        const { awb_bl_no, hawb_hbl_no, mbl_details, hbl_details } = row.original;
        const mblList = Array.isArray(mbl_details) && mbl_details.length > 0
          ? mbl_details.map(m => (typeof m === 'object' ? m?.mbl_no : m)).filter(Boolean)
          : (awb_bl_no ? [awb_bl_no] : []);
        const hblList = Array.isArray(hbl_details) && hbl_details.length > 0
          ? hbl_details.map(h => (typeof h === 'object' ? h?.hbl_no : h)).filter(Boolean)
          : (hawb_hbl_no ? [hawb_hbl_no] : []);

        return (
          <div>
            {mblList.length > 0 && <div>{mblList.join(", ")}</div>}
            {hblList.length > 0 && <div style={{ color: "#1e40af", fontSize: "11px", fontWeight: 500 }}>H: {hblList.join(", ")}</div>}
            {mblList.length === 0 && hblList.length === 0 && "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "awb_bl_date",
      header: "BL Date",
      enableSorting: false,
      size: 160,
      Cell: ({ cell, row }) => {
        const { awb_bl_date, hawb_hbl_date, mbl_details, hbl_details } = row.original;
        const mblDates = Array.isArray(mbl_details) && mbl_details.length > 0
          ? mbl_details.map(m => (typeof m === 'object' ? m?.mbl_date : "")).filter(Boolean)
          : (awb_bl_date ? [awb_bl_date] : []);
        const hblDates = Array.isArray(hbl_details) && hbl_details.length > 0
          ? hbl_details.map(h => (typeof h === 'object' ? h?.hbl_date : "")).filter(Boolean)
          : (hawb_hbl_date ? [hawb_hbl_date] : []);

        return (
          <div>
            {mblDates.length > 0 && <div>{mblDates.join(", ")}</div>}
            {hblDates.length > 0 && <div style={{ color: "#1e40af", fontSize: "11px" }}>H: {hblDates.join(", ")}</div>}
            {mblDates.length === 0 && hblDates.length === 0 && "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "commodity",
      header: "Commodity",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "no_of_pkgs",
      header: "No of Pkgs",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "net_weight",
      header: "Net Weight",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "loading_port",
      header: "POL",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "arrival_date",
      header: "Arrival Date",
      enableSorting: false,
      size: 250,

      Cell: ({ cell }) =>
        cell.row.original.container_nos?.map((container, id) => (
          <React.Fragment key={id}>
            {container.arrival_date}
            <br />
          </React.Fragment>
        )),
      filterFn: "includes",
      accessorFn: (row) =>
        row.container_nos
          ?.map((container) => container.arrival_date)
          .join(", "),
    },
    {
      accessorKey: "free_time",
      header: "Free Time",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "detention_from",
      header: "Detention From",
      enableSorting: false,
      size: 250,

      Cell: ({ cell }) =>
        isAirMode(cell.row.original.mode)
          ? null
          : cell.row.original.container_nos?.map((container, id) => (
              <React.Fragment key={id}>
                {container.detention_from}
                <br />
              </React.Fragment>
            )),
      filterFn: "includes",
      accessorFn: (row) =>
        isAirMode(row.mode)
          ? ""
          : row.container_nos
              ?.map((container) => container.detention_from)
              .join(", "),
    },
    {
      accessorKey: "shipping_line_airline",
      header: "Shipping Line",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "container_no",
      header: "Container/Package Number",
      enableSorting: false,
      size: 250,

      Cell: ({ cell }) =>
        cell.row.original.container_nos?.map((container, id) => (
          <React.Fragment key={id}>
            {container.container_number}
            <br />
          </React.Fragment>
        )),
      filterFn: "includes",
      accessorFn: (row) =>
        row.container_nos
          ?.map((container) => container.container_number)
          .join(", "),
    },
    {
      accessorKey: "size",
      header: "Size",
      enableSorting: false,
      size: 250,

      Cell: ({ cell }) =>
        isAirMode(cell.row.original.mode)
          ? null
          : cell.row.original.container_nos?.map((container, id) => (
              <React.Fragment key={id}>
                {container.size}
                <br />
              </React.Fragment>
            )),
      filterFn: "includes",
      accessorFn: (row) =>
        isAirMode(row.mode)
          ? ""
          : row.container_nos?.map((container) => container.size).join(", "),
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "do_validity",
      header: "DO Validity",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "be_no",
      header: "BE No",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "be_date",
      header: "BE Date",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "assessment_date",
      header: "Assessment Date",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "examination_date",
      header: "Examination Date",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "duty_paid_date",
      header: "Duty Paid Date",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "out_of_charge",
      header: "Out of Charge Date",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "detailed_status",
      header: "Detailed Status",
      enableSorting: false,
      size: 250,
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false, // Disable density toggle
    initialState: { density: "compact", columnPinning: { left: ["job_no"] } }, // Set initial table density to compact,
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enableStickyHeader: true, // Enable sticky header
    enableColumnPinning: true, // Enable pinning for sticky columns
    muiTableContainerProps: {
      sx: { maxHeight: "580px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
      style: getTableRowInlineStyle(row),
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
        </div>
      </>
    ),
  });

  return (
    <>
      <MaterialReactTable table={table} />
    </>
  );
}

export default React.memo(ViewDSR);