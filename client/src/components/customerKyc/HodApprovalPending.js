import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { useNavigation } from "../../contexts/NavigationContext";
import CustomTable from "./CustomTable";
import { Visibility, PersonOutline, AccessTime } from "@mui/icons-material";

function HodApprovalPending() {
  const [data, setData] = useState([]);
  const { user } = useContext(UserContext);
  const { navigateWithRef } = useNavigation();

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/hod-approval-pending`
        );
        setData(res.data);
      } catch (error) {
        console.error("Error fetching HOD pending list:", error);
      }
    }
    getData();
  }, []);

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
            navigateWithRef(`/view-customer-kyc/${cell.row.original._id}`)
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
          {cell.getValue()}
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
          <button
            className="table-action-btn"
            title="Review Application"
            onClick={() =>
              navigateWithRef(`/view-customer-kyc/${cell.row.original._id}`)
            }
          >
            <Visibility fontSize="small" />
          </button>
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
          Pending Approval
        </h2>
        <p className="page-subtitle">Applications awaiting final review</p>
      </div>

      <div className="card-body">
        {data.length > 0 && (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              background: "var(--info-light)",
              border: "1px solid var(--info)",
              borderRadius: "var(--radius-md)",
              color: "#0369a1",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AccessTime />
            <span>
              <strong>{data.length}</strong> application
              {data.length !== 1 ? "s" : ""} awaiting approval.
            </span>
          </div>
        )}
        <CustomTable columns={columns} data={data} />
      </div>
    </div>
  );
}

export default React.memo(HodApprovalPending);
