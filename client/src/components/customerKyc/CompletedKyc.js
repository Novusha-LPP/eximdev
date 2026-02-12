import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { useNavigation } from "../../contexts/NavigationContext";
import CustomTable from "./CustomTable";
import {
  Visibility,
  Edit,
  CheckCircle,
  Cancel,
  PendingOutlined,
} from "@mui/icons-material";

function CompletedKyc() {
  const [data, setData] = useState([]);
  const { user } = useContext(UserContext);
  const { navigateWithRef } = useNavigation();

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/view-completed-kyc`
        );
        setData(res.data);
      } catch (error) {
        console.error("Error fetching completed KYC list:", error);
      }
    }
    getData();
  }, []);

  const getStatusChip = (status) => {
    let type = "neutral";
    let icon = null;

    if (status === "Approved") {
      type = "success";
      icon = <CheckCircle style={{ fontSize: "1rem" }} />;
    } else if (status === "Rejected") {
      type = "error";
      icon = <Cancel style={{ fontSize: "1rem" }} />;
    } else if (status === "Pending") {
      type = "warning";
      icon = <PendingOutlined style={{ fontSize: "1rem" }} />;
    } else if (status === "Sent for revision") {
      type = "info";
      icon = <Edit style={{ fontSize: "1rem" }} />;
    }

    return (
      <span
        className={`status-pill ${type}`}
        style={{ display: "inline-flex", gap: "0.25rem" }}
      >
        {icon} {status}
      </span>
    );
  };

  const getCategoryChip = (category) => {
    let type = "neutral";
    if (category?.includes("Individual")) type = "info";
    if (category?.includes("Company")) type = "success";

    return (
      <span
        className={`status-pill ${type === "neutral" ? "info" : type}`}
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
      size: 250,
      Cell: ({ cell }) => (
        <span
          style={{
            fontWeight: 600,
            color: "var(--primary-600)",
            cursor: "pointer",
          }}
          onClick={() =>
            navigateWithRef(`/view-completed-kyc/${cell.row.original._id}`)
          }
        >
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
          className={`status-pill ${
            cell.getValue() === "Manufacturer" ? "success" : "info"
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
          {cell.getValue() || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "approval",
      header: "Approval Status",
      size: 250,
      Cell: ({ cell }) => getStatusChip(cell.getValue()),
    },
    {
      accessorKey: "approved_by",
      header: "Approved By",
      size: 250,
      Cell: ({ cell }) => (
        <span
          style={{
            fontStyle: cell.getValue() ? "normal" : "italic",
            color: "var(--slate-500)",
          }}
        >
          {cell.getValue() || "Not Assigned"}
        </span>
      ),
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      size: 220,
      Cell: ({ cell }) => (
        <span
          title={cell.getValue() || "No remarks"}
          style={{
            maxWidth: "200px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--slate-500)",
            fontSize: "0.9rem",
          }}
        >
          {cell.getValue() || "No remarks"}
        </span>
      ),
    },
    {
      accessorKey: "view",
      header: "Actions",
      size: 150,
      Cell: ({ cell }) =>
        user.role === "Admin" ? (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="table-action-btn"
              title="View Details"
              onClick={() =>
                navigateWithRef(`/view-completed-kyc/${cell.row.original._id}`)
              }
            >
              <Visibility fontSize="small" />
            </button>
            <button
              className="table-action-btn"
              title="Edit KYC"
              onClick={() =>
                navigateWithRef(`/revise-customer-kyc/${cell.row.original._id}`)
              }
            >
              <Edit fontSize="small" />
            </button>
          </div>
        ) : (
          <span style={{ color: "var(--slate-400)", fontSize: "0.75rem" }}>
            No Access
          </span>
        ),
    },
  ];

  return (
    <div className="premium-card">
      <div className="card-header">
        <h2
          className="page-title"
          style={{ fontSize: "1.5rem", paddingBottom: "0.5rem" }}
        >
          Completed KYC
        </h2>
        <p className="page-subtitle">Archive of processed applications</p>
      </div>

      <div className="card-body">
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            background: "var(--success-light)",
            border: "1px solid var(--success)",
            borderRadius: "var(--radius-md)",
            color: "#047857",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <CheckCircle />
          <span>
            <strong>{data.length}</strong> completed applications found.
          </span>
        </div>
        <CustomTable columns={columns} data={data} />
      </div>
    </div>
  );
}

export default React.memo(CompletedKyc);
