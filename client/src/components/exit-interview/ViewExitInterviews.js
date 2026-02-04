import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";

function ViewExitOnboardings() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-exit-interviews`
      );
      setData(res.data);
    }
    getData();
  }, []);

  const columns = [
    {
      accessorKey: "employee_name",
      header: "Employee Name",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "company",
      header: "Company",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "department",
      header: "Department",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "last_date",
      header: "Last Date",
      enableSorting: false,
      size: 110,
    },
    {
      accessorKey: "job_satisfaction",
      header: "Job Satisfaction",
      enableSorting: false,
      size: 130,
      Cell: ({ cell }) => {
        const value = cell.getValue();
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: value >= 4 ? 'var(--hr-success)' : value >= 3 ? 'var(--hr-warning)' : 'var(--hr-error)'
          }}>
            {'★'.repeat(value || 0)}
            {'☆'.repeat(5 - (value || 0))}
          </span>
        );
      },
    },
    {
      accessorKey: "support_from_manager",
      header: "Manager Support",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "approach_of_reporting_manager",
      header: "Manager Approach",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "overall_company_culture",
      header: "Company Culture",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "training_and_development",
      header: "Training",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "suggestions",
      header: "Suggestions",
      enableSorting: false,
      size: 250,
      Cell: ({ cell }) => {
        const value = cell.getValue();
        if (!value) return <span style={{ color: 'var(--hr-text-muted)' }}>—</span>;
        return (
          <span
            title={value}
            style={{
              display: 'block',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {value}
          </span>
        );
      },
    },
  ];

  const table = useTableConfig(data, columns);

  return (
    <div className="hr-table-container hr-animate-in">
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(ViewExitOnboardings);
