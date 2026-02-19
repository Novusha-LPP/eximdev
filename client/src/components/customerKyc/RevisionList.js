import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { useNavigation } from "../../contexts/NavigationContext";
import { useSnackbar } from "../../contexts/SnackbarContext";
import CustomTable from "./CustomTable";
import { Edit, Warning, PersonOutline, AccessTime, Visibility, Delete } from "@mui/icons-material";

function RevisionList({ type = "revisions" }) {
  const [data, setData] = useState([]);
  const { user } = useContext(UserContext);
  const { navigateWithRef } = useNavigation();
  const { showSuccess, showError } = useSnackbar();

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this application?")) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-customer-kyc/${id}`);
        setData(prev => prev.filter(item => item._id !== id));
        showSuccess("Application deleted successfully");
      } catch (error) {
        console.error("Error deleting application", error);
        showError("Failed to delete application");
      }
    }
  };

  const isApprovalMode = type === "pending_approval";

  useEffect(() => {
    async function getData() {
      try {
        const endpoint = `${process.env.REACT_APP_API_STRING}/view-revision-list`;

        const res = await axios.get(endpoint);
        setData(res.data);
      } catch (error) {
        console.error(`Error fetching list for ${type}:`, error);
      }
    }
    getData();
  }, [type, isApprovalMode]);

  const getCategoryChip = (category) => {
    let styleType = "neutral";
    if (category?.includes("Individual")) styleType = "info";
    if (category?.includes("Company")) styleType = "success";

    return (
      <span
        className={`status-pill ${styleType === "neutral" ? "info" : styleType}`}
        style={{ fontWeight: 500, textTransform: "none" }}
      >
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
            color: "var(--primary-600)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
          }}
          onClick={() =>
            navigateWithRef(
              isApprovalMode
                ? `/view-customer-kyc/${cell.row.original._id}`
                : `/revise-customer-kyc/${cell.row.original._id}`
            )
          }
        >
          <PersonOutline style={{ fontSize: 16, color: "var(--accent-500)" }} />
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
        <span
          className={`status-pill ${cell.getValue() === "Manufacturer" ? "success" : "info"
            }`}
        >
          {cell.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "iec_no",
      header: "IEC Number",
      size: 250,
      Cell: ({ cell }) => (
        <span style={{ fontFamily: "monospace", color: "var(--slate-600)" }}>
          {cell.getValue()}
        </span>
      ),
    },
    // Conditionally show Status column if needed. 
    !isApprovalMode && {
      accessorKey: "approval",
      header: "Status",
      size: 250,
      Cell: ({ cell }) => (
        <span
          className="status-pill warning"
          style={{ display: "inline-flex", gap: "0.25rem" }}
        >
          <Warning style={{ fontSize: "1rem" }} /> {cell.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "remarks",
      header: isApprovalMode ? "Remarks" : "Revision Notes",
      size: 220,
      Cell: ({ cell }) => (
        <span
          title={cell.getValue() || (isApprovalMode ? "No remarks" : "No specific remarks")}
          style={isApprovalMode ? {
            maxWidth: "200px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--slate-500)",
            fontSize: "0.9rem",
          } : {
            minWidth: "200px",
            maxWidth: "400px",
            whiteSpace: "normal",
            wordBreak: "break-word",
            color: "var(--error)",
            fontWeight: 500,
            display: "block",
            lineHeight: "1.4"
          }}
        >
          {cell.getValue() || (isApprovalMode ? "No remarks" : "Requires attention")}
        </span>
      ),
    },
    {
      accessorKey: isApprovalMode ? "view" : "revise",
      header: "Actions",
      size: 150,
      Cell: ({ cell }) =>
        user?.role === "Admin" ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="table-action-btn"
              title={isApprovalMode ? "Review Application" : "Start Revision Process"}
              onClick={() =>
                navigateWithRef(
                  isApprovalMode
                    ? `/view-customer-kyc/${cell.row.original._id}`
                    : `/revise-customer-kyc/${cell.row.original._id}`
                )
              }
            >
              {isApprovalMode ? <Visibility fontSize="small" /> : <Edit fontSize="small" />}
            </button>
            <button
              className="table-action-btn"
              title="Delete Application"
              style={{ color: '#ef4444' }}
              onClick={() => handleDelete(cell.row.original._id)}
            >
              <Delete fontSize="small" />
            </button>
          </div>
        ) : (
          <span style={{ color: "var(--slate-400)", fontSize: "0.75rem" }}>
            No Access
          </span>
        ),
    },
  ].filter(Boolean);

  return (
    <div className="kyc-page-wrapper">
      <div className="kyc-page-header">
        <div className="kyc-header-left">
          <h2 className="kyc-page-title">
            {isApprovalMode ? (
              <>
                <AccessTime style={{ fontSize: "1.2rem", color: "var(--info)" }} /> Pending Final Approval
              </>
            ) : (
              <>
                <Warning style={{ fontSize: "1.2rem", color: "var(--warning)" }} /> Applications Requiring Revision
              </>
            )}
          </h2>
        </div>
        <span className="kyc-verified-tag">
          {data.length} application{data.length !== 1 ? "s" : ""} {isApprovalMode ? "awaiting final review" : "require attention"}
        </span>
      </div>

      <div className="kyc-card">
        <div className="kyc-section" style={{ padding: "1.5rem" }}>
          <CustomTable columns={columns} data={data} />
        </div>
      </div>
    </div>
  );
}

export default React.memo(RevisionList);
