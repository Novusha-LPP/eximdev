import * as React from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function ESanchit() {
  const [rows, setRows] = React.useState([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-esanchit-jobs`
      );
      setRows(res.data);
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      enableSorting: false,
      size: 150,

      Cell: ({ cell }) => {
        const {
          job_no,
          year,
          type_of_b_e,
          consignment_type,
          vessel_berthing,
          container_nos, // Assume this field holds an array of container objects
          detailed_status,
          custom_house,
          delivery_date,
        } = cell.row.original;

        return (
          <div
            onClick={() => navigate(`/esanchit-job/${job_no}/${year}`)}
            style={{
              cursor: "pointer",
              color: "blue",
            }}
          >
            {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
            {custom_house}
            <br />
          </div>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Importer",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Num & Date",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => {
        const { awb_bl_no, awb_bl_date } = cell.row.original; // Destructure properties here
        return (
          <div>
            {awb_bl_no} <br /> {awb_bl_date}
          </div>
        );
      },
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
                {container.container_number}| "{container.size}"
              </div>
            ))}
          </React.Fragment>
        );
      },
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false, // Disable density toggle
    initialState: { density: "compact", pagination: { pageSize: 20 } }, // Set initial table density to compact
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enableStickyHeader: true, // Enable sticky header
    enablePinning: true, // Enable pinning for sticky columns
    muiTableContainerProps: {
      sx: { maxHeight: "750px", overflowY: "auto" },
    },
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
  });

  return (
    <div className="table-container">
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(ESanchit);
