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
    <div className="kyc-page-wrapper">
      <div className="kyc-page-header">
        <div className="kyc-header-left">
          <h2 className="kyc-page-title">
            <DraftsOutlined style={{ fontSize: "1.2rem" }} /> Draft Applications
          </h2>
        </div>
        <span className="kyc-verified-tag">Resume your incomplete applications</span>
      </div>

      <div className="kyc-card">
        <div className="kyc-section" style={{ padding: "1.5rem" }}>
          <CustomTable columns={columns} data={data} />
        </div>
      </div>
    </div>
  );
}

export default React.memo(ViewDrafts);
