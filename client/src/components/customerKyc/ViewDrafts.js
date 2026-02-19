import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigation } from "../../contexts/NavigationContext";
import { UserContext } from "../../contexts/UserContext";
import { useSnackbar } from "../../contexts/SnackbarContext";
import CustomTable from "./CustomTable";
import { Visibility, DraftsOutlined, Delete } from "@mui/icons-material";

function ViewDrafts() {
  const [data, setData] = useState([]);
  const { navigateWithRef } = useNavigation();
  const { user } = useContext(UserContext);
  const { showSuccess, showError } = useSnackbar();

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this draft application?")) {
      try {
        await axios.delete(
          `${process.env.REACT_APP_API_STRING}/delete-customer-kyc/${id}`
        );
        setData((prev) => prev.filter((item) => item._id !== id));
        showSuccess("Draft deleted successfully");
      } catch (error) {
        console.error("Error deleting draft:", error);
        showError("Failed to delete draft");
      }
    }
  };

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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="table-action-btn"
            title="View Draft Details"
            onClick={() => navigateWithRef(`/view-draft-details/${cell.row.original._id}`)}
          >
            <Visibility fontSize="small" />
          </button>
          {user?.role === 'Admin' && (
            <button
              className="table-action-btn"
              title="Delete Draft"
              style={{ color: '#ef4444' }}
              onClick={() => handleDelete(cell.row.original._id)}
            >
              <Delete fontSize="small" />
            </button>
          )}
        </div>
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
