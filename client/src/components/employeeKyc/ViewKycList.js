import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";
import { Link } from "react-router-dom";

// Status badge component
const StatusBadge = ({ status }) => {
  const getStatusClass = () => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      default:
        return 'pending';
    }
  };

  return (
    <span className={`hr-status-badge ${getStatusClass()}`}>
      {status || 'Pending'}
    </span>
  );
};

function ViewKycList() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-all-kycs`
      );
      setData(res.data);
    }
    getData();
  }, []);

  const columns = [
    {
      accessorKey: "first_name",
      header: "First Name",
      enableSorting: false,
      size: 140,
    },
    {
      accessorKey: "middle_name",
      header: "Middle Name",
      enableSorting: false,
      size: 140,
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
      enableSorting: false,
      size: 140,
    },
    {
      accessorKey: "email",
      header: "Email",
      enableSorting: false,
      size: 220,
    },
    {
      accessorKey: "company",
      header: "Company",
      enableSorting: false,
      size: 250,
    },
    {
      accessorKey: "kyc_approval",
      header: "Status",
      enableSorting: false,
      size: 130,
      Cell: ({ cell }) => <StatusBadge status={cell.getValue()} />,
    },
    {
      accessorKey: "action",
      header: "Action",
      enableSorting: false,
      size: 100,
      Cell: ({ cell }) => (
        <Link
          to={`/view-kyc/${cell.row.original.username}`}
          className="hr-btn hr-btn-secondary"
          style={{ padding: '6px 14px', fontSize: '0.85rem' }}
        >
          View
        </Link>
      ),
    },
  ];

  const table = useTableConfig(data, columns);

  return (
    <div className="hr-table-container hr-animate-in">
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(ViewKycList);
