import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";

// Document link component
const DocumentLink = ({ url, label }) => {
  if (!url) {
    return (
      <span style={{ color: 'var(--hr-text-muted)', fontSize: '0.85rem' }}>
        Not uploaded
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'var(--hr-primary)',
        textDecoration: 'none',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      </svg>
      View
    </a>
  );
};

function ViewOnboardings() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-onboardings`
      );
      setData(res.data);
    }
    getData();
  }, []);

  const columns = [
    {
      accessorKey: "username",
      header: "Username",
      enableSorting: false,
      size: 140,
    },
    {
      accessorKey: "first_name",
      header: "First Name",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "middle_name",
      header: "Middle Name",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "email",
      header: "Email",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "employee_photo",
      header: "Photo",
      enableSorting: false,
      size: 100,
      Cell: ({ cell }) => <DocumentLink url={cell.getValue()} />,
    },
    {
      accessorKey: "resume",
      header: "Resume",
      enableSorting: false,
      size: 100,
      Cell: ({ cell }) => <DocumentLink url={cell.getValue()} />,
    },
    {
      accessorKey: "address_proof",
      header: "Address Proof",
      enableSorting: false,
      size: 120,
      Cell: ({ cell }) => <DocumentLink url={cell.getValue()} />,
    },
    {
      accessorKey: "nda",
      header: "NDA",
      enableSorting: false,
      size: 80,
      Cell: ({ cell }) => <DocumentLink url={cell.getValue()} />,
    },
  ];

  const table = useTableConfig(data, columns);

  return (
    <div className="hr-table-container hr-animate-in">
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(ViewOnboardings);
