// import React, { useEffect, useState } from "react";
// import {
//   MaterialReactTable,
//   useMaterialReactTable,
// } from "material-react-table";
// import axios from "axios";
// import { TextField, IconButton } from "@mui/material";
// import SaveIcon from "@mui/icons-material/Save";

// function DoPlanningContainerTable(props) {
//   const [rows, setRows] = useState([]);

//   useEffect(() => {
//     async function getData() {
//       const res = await axios(
//         `${process.env.REACT_APP_API_STRING}/get-job/${props.year}/${props.job_no}`
//       );
//       setRows(res.data.container_nos);
//     }

//     getData();
//   }, []);

//   async function handleSave() {
//     const res = await axios.post(
//       `${process.env.REACT_APP_API_STRING}/save-do-container`,
//       { container_nos: rows, year: props.year, job_no: props.job_no }
//     );
//     alert(res.data.message);
//   }

//   const columns = [
//     {
//       accessorKey: "container_number",
//       header: "Container No",
//       enableSorting: false,
//       size: 160,
//     },
//     {
//       accessorKey: "size",
//       header: "Size",
//       enableSorting: false,
//       size: 160,
//     },
//     {
//       accessorKey: "do_validity_upto_container_level",
//       header: "DO Validity Upto",
//       enableSorting: false,
//       size: 160,
//       Cell: () => {
//         return (
//           <>
//             <TextField size="small" type="date" />
//           </>
//         );
//       },
//     },
//     {
//       accessorKey: "action",
//       header: "Save",
//       enableSorting: false,
//       size: 100,
//       Cell: ({ cell, row }) => (
//         <IconButton>
//           <SaveIcon sx={{ color: "#015C4B" }} />
//         </IconButton>
//       ),
//     },
//   ];

//   const table = useMaterialReactTable({
//     columns,
//     data: rows,
//     initialState: {
//       density: "compact",
//     }, // Set initial table density to compact
//     enableColumnFilters: false,
//     enableColumnActions: false,
//     enableTopToolbar: false,
//     enableBottomToolbar: false,
//   });

//   return (
//     <>
//       <MaterialReactTable table={table} />
//     </>
//   );
// }

// export default DoPlanningContainerTable;

import React, { useEffect, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import axios from "axios";
import { TextField, IconButton } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

function DoPlanningContainerTable(props) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-job/${props.year}/${props.job_no}`
      );
      setRows(res.data.container_nos);
    }

    getData();
  }, [props.year, props.job_no]);

  async function handleSave(rowIndex) {
    const updatedRow = rows[rowIndex];
    console.log("Job No:", props.job_no);
    console.log("Year:", props.year);
    console.log("Container No:", updatedRow.container_number);
    console.log(
      "DO Validity Upto:",
      updatedRow.do_validity_upto_container_level
    );

    const res = await axios.post(
      `${process.env.REACT_APP_API_STRING}/update-do-container`,
      {
        year: props.year,
        job_no: props.job_no,
        container_number: updatedRow.container_number,
        do_validity_upto_container_level:
          updatedRow.do_validity_upto_container_level,
      }
    );
    alert(res.data.message);
  }

  const handleDateChange = (e, rowIndex) => {
    const newDate = e.target.value;
    setRows((prevRows) =>
      prevRows.map((row, index) =>
        index === rowIndex
          ? { ...row, do_validity_upto_container_level: newDate }
          : row
      )
    );
  };

  const columns = [
    {
      accessorKey: "container_number",
      header: "Container No",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "size",
      header: "Size",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "do_validity_upto_container_level",
      header: "DO Validity Upto",
      enableSorting: false,
      size: 160,
      Cell: ({ row }) => {
        return (
          <TextField
            size="small"
            type="date"
            value={row.original.do_validity_upto_container_level || ""}
            onChange={(e) => handleDateChange(e, row.index)}
          />
        );
      },
    },
    {
      accessorKey: "action",
      header: "Save",
      enableSorting: false,
      size: 100,
      Cell: ({ row }) => (
        <IconButton onClick={() => handleSave(row.index)}>
          <SaveIcon sx={{ color: "#015C4B" }} />
        </IconButton>
      ),
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    initialState: {
      density: "compact",
    }, // Set initial table density to compact
    enableColumnFilters: false,
    enableColumnActions: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
  });

  return (
    <>
      <MaterialReactTable table={table} />
    </>
  );
}

export default DoPlanningContainerTable;
