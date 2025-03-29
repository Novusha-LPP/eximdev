import { useMaterialReactTable } from "material-react-table";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function useTableConfig(rows, columns, url) {
  const navigate = useNavigate();

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false, // Disable density toggle
    enablePagination: false,
    enableBottomToolbar: false,
    initialState: {
      density: "compact",
      columnPinning: { left: ["username", "employee_name", "job_no"] },
    }, // Set initial table density to compact
    enableColumnPinning: true, // Enable column pinning
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enableStickyHeader: true, // Enable sticky header
    enablePinning: true, // Enable pinning for sticky columns
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row, url }) => ({
      onClick: async () => {
        // Log the entire row data
        // console.log("Clicked Row Data:", row.original);

        try {
          // Make an API call to fetch detailed user data
          const response = await axios.get(
            `${process.env.REACT_APP_API_STRING}/view-onboarding/${row.original._id}`
          );

          // Log the detailed user data
          // console.log("Detailed User Data:", response.data);

          // Navigate to the detailed view
          // navigate(`/onboarding/${row.original._id}`);
          navigate(`/${url}/${row.original._id}`);
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      },
      style: { cursor: "pointer" },
    }),
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
  });

  return table;
}

export default useTableConfig;
