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

  const columns = React.useMemo(() => [
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
  ], [user.role, navigateWithRef]);

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/hod-approval-pending`
        );
        setData(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error fetching HOD pending list:", error);
        setData([]);
      }
    }
    getData();
  }, []);

  return (
    <div className="kyc-page-wrapper">
      <div className="kyc-page-header">
        <div className="kyc-header-left">
          <h2 className="kyc-page-title">
            <AccessTime style={{ fontSize: "1.2rem", color: "var(--info)" }} /> Pending Final Approval
          </h2>
        </div>
        <span className="kyc-verified-tag">
          {data.length} application{data.length !== 1 ? "s" : ""} awaiting final review
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

export default React.memo(HodApprovalPending);
