import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigation } from "../../contexts/NavigationContext";
import CustomTable from "./CustomTable";
import { Visibility, DraftsOutlined } from "@mui/icons-material";

function ViewDrafts() {
  const [data, setData] = useState([]);
  const { navigateWithRef } = useNavigation();

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/view-customer-kyc-drafts`
        );
        setData(res.data);
      } catch (error) {
        console.error("Error fetching drafts:", error);
      }
    }
    getData();
  }, []);

  const getCategoryChip = (category) => {
    let type = 'neutral';
    if (category?.includes('Individual')) type = 'info';
    if (category?.includes('Company')) type = 'success';

    return (
      <span className={`status-pill ${type === 'neutral' ? 'info' : type}`} style={{ fontWeight: 500, textTransform: 'none' }}>
        {category}
      </span>
    );
  };

  const columns = [
    {
      accessorKey: "name_of_individual",
      header: "Customer Name",
      size: 280,
      Cell: ({ cell }) => (
        <span
          style={{
            fontWeight: 600,
            color: 'var(--primary-600)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
          onClick={() => navigateWithRef(`/view-draft-details/${cell.row.original._id}`)}
        >
          <DraftsOutlined style={{ fontSize: 16, color: 'var(--accent-500)' }} />
          {cell.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      size: 250,
      Cell: ({ cell }) => getCategoryChip(cell.getValue()),
    },
    {
      accessorKey: "status",
      header: "Business Type",
      size: 250,
      Cell: ({ cell }) => (
        <span className={`status-pill ${cell.getValue() === 'Manufacturer' ? 'success' : 'info'}`}>
          {cell.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "iec_no",
      header: "IEC Number",
      size: 250,
      Cell: ({ cell }) => (
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          backgroundColor: 'var(--slate-100)',
          padding: '2px 8px',
          borderRadius: '4px',
          color: 'var(--slate-700)'
        }}>
          {cell.getValue() || 'Pending'}
        </span>
      ),
    },
    {
      accessorKey: "action",
      header: "Actions",
      size: 150,
      Cell: ({ cell }) => (
        <button
          className="table-action-btn"
          title="View Draft Details"
          onClick={() => navigateWithRef(`/view-draft-details/${cell.row.original._id}`)}
        >
          <Visibility fontSize="small" />
        </button>
      ),
    },
  ];

  return (
    <div className="premium-card">
      <div className="card-header">
           <h2 className="page-title" style={{ fontSize: "1.5rem", paddingBottom: "0.5rem" }}>Draft Applications</h2>
        <p className="page-subtitle">Resume your incomplete applications</p>
      </div>

      <div className="card-body">
        <CustomTable columns={columns} data={data} />
      </div>
    </div>
  );
}

export default React.memo(ViewDrafts);
