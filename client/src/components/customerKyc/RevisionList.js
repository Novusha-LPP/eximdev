import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { useNavigation } from "../../contexts/NavigationContext";
import CustomTable from "./CustomTable";
import { Edit, Warning, PersonOutline } from "@mui/icons-material";

function RevisionList() {
  const [data, setData] = useState([]);
  const { user } = useContext(UserContext);
  const { navigateWithRef } = useNavigation();

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/view-revision-list`
        );
        setData(res.data);
      } catch (error) {
        console.error("Error fetching revision list:", error);
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
            navigateWithRef(`/revise-customer-kyc/${cell.row.original._id}`)
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
      header: "Revision Notes",
      size: 220,
      Cell: ({ cell }) => (
        <span
          title={cell.getValue() || "No specific remarks"}
          style={{
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
          {cell.getValue() || "Requires attention"}
        </span>
      ),
    },
    {
      accessorKey: "revise",
      header: "Actions",
      size: 150,
      Cell: ({ cell }) =>
        user.role === "Admin" ? (
          <button
            className="table-action-btn"
            title="Start Revision Process"
            onClick={() =>
              navigateWithRef(`/revise-customer-kyc/${cell.row.original._id}`)
            }
          >
            <Edit fontSize="small" />
          </button>
        ) : (
          <span style={{ color: "var(--slate-400)", fontSize: "0.75rem" }}>
            No Access
          </span>
        ),
    },
  ];

  return (
    <div className="kyc-page-wrapper">
      <div className="kyc-page-header">
        <div className="kyc-header-left">
          <h2 className="kyc-page-title">
            <Warning style={{ fontSize: "1.2rem", color: "var(--warning)" }} /> Applications Requiring Revision
          </h2>
        </div>
        <span className="kyc-verified-tag">
          {data.length} application{data.length !== 1 ? "s" : ""} require attention
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
