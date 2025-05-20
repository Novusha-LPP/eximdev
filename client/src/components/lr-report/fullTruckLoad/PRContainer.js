import { useEffect, useMemo, useState, useCallback } from "react";
import { MaterialReactTable } from "material-react-table";
import { Box, IconButton, Tooltip, Button } from "@mui/material";
import { Delete, Edit, Add } from "@mui/icons-material";
import { CreatePrModal, INITIAL_PR_DATA } from "./CreatePrModal";
import * as prService from "../../../services/prService";

const PRContainer = () => {
  const [prData, setPrData] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });
  const [totalRows, setTotalRows] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPrData, setNewPrData] = useState(INITIAL_PR_DATA);

  // Optimize data fetching for PR
  const getPrData = useCallback(async (page = 1, limit = 50) => {
    setIsLoading(true);

    try {
      const res = await prService.getPrData(page, limit);
      setPrData(res.data);
      setTotalRows(res.total || 0);

      console.log("✅ PR data loaded successfully:", res);
    } catch (error) {
      console.error("❌ Error fetching PR data:", error);
      if (error.code === "ERR_NETWORK") {
        alert(
          "Network error: Could not connect to the server. Please try again later."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data on mount and when pagination changes
  useEffect(() => {
    getPrData(pagination.pageIndex + 1, pagination.pageSize);
  }, [getPrData, pagination.pageIndex, pagination.pageSize]);

  const handleInputChange = (field) => (event) => {
    setNewPrData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleCreateModalClose = () => {
    setCreateModalOpen(false);
    setNewPrData(INITIAL_PR_DATA);
  };

  const handleCreatePr = async () => {
    setIsSaving(true);
    try {
      await prService.createPr(newPrData);
      await getPrData(pagination.pageIndex + 1, pagination.pageSize);
      handleCreateModalClose();
      alert("PR created successfully");
    } catch (error) {
      console.error("Error creating PR:", error);
      alert("Failed to create PR. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePr = async ({ row, values }) => {
    setIsSaving(true);
    try {
      await prService.updatePrData(row.original._id, values);
      await getPrData(pagination.pageIndex + 1, pagination.pageSize);
    } catch (error) {
      console.error("Error updating PR:", error);
      alert("Failed to update PR. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePr = async (row) => {
    if (!window.confirm("Are you sure you want to delete this PR?")) return;

    setIsSaving(true);
    try {
      await prService.deletePr(row.original._id);
      await getPrData(pagination.pageIndex + 1, pagination.pageSize);
      alert("PR deleted successfully");
    } catch (error) {
      console.error("Error deleting PR:", error);
      alert("Failed to delete PR. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContainer = async (prId, values) => {
    setIsSaving(true);
    try {
      await prService.updateContainerData(prId, values);
      await getPrData(pagination.pageIndex + 1, pagination.pageSize);
    } catch (error) {
      console.error("Error updating container:", error);
      alert("Failed to update container. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContainer = async (prId, containerId) => {
    if (!window.confirm("Are you sure you want to delete this container?"))
      return;

    setIsSaving(true);
    try {
      await prService.deleteContainer(prId, containerId);
      await getPrData(pagination.pageIndex + 1, pagination.pageSize);
      alert("Container deleted successfully");
    } catch (error) {
      console.error("Error deleting container:", error);
      alert("Failed to delete container. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Define columns for PR (parent rows)
  const prColumns = useMemo(
    () => [
      {
        accessorKey: "pr_no",
        header: "PR Number",
        enableEditing: true,
      },
      {
        accessorKey: "pr_date",
        header: "PR Date",
        enableEditing: true,
      },
      {
        accessorKey: "shipper",
        header: "Shipper",
        enableEditing: true,
      },
      {
        accessorKey: "consignee",
        header: "Consignee",
        enableEditing: true,
      },
    ],
    []
  );

  // Define columns for Containers (child rows)
  const containerColumns = useMemo(
    () => [
      {
        accessorKey: "container_number",
        header: "Container Number",
        enableEditing: true,
      },
      {
        accessorKey: "seal_no",
        header: "Seal Number",
        enableEditing: true,
      },
      {
        accessorKey: "container_type",
        header: "Container Type",
        enableEditing: true,
      },
      {
        accessorKey: "weight",
        header: "Weight",
        enableEditing: true,
      },
    ],
    []
  );

  const renderContainerTable = useCallback(
    ({ row }) => (
      <div style={{ paddingLeft: "2rem" }}>
        <MaterialReactTable
          columns={containerColumns}
          data={row.original.containers || []}
          enableEditing
          editingMode="row"
          enableRowActions
          positionActionsColumn="last"
          renderRowActions={({ row: containerRow, table }) => (
            <Box sx={{ display: "flex", gap: "1rem" }}>
              <Tooltip title="Edit">
                <IconButton onClick={() => table.setEditingRow(containerRow)}>
                  <Edit />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  color="error"
                  onClick={() =>
                    handleDeleteContainer(
                      row.original._id,
                      containerRow.original._id
                    )
                  }
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          onEditingRowSave={({ row: containerRow, values }) =>
            handleSaveContainer(row.original._id, values)
          }
          muiTableBodyRowProps={{ hover: false }}
          muiTablePaperProps={{
            elevation: 0,
            sx: {
              borderRadius: "0",
              border: "1px solid #e0e0e0",
            },
          }}
          renderTopToolbarCustomActions={() => (
            <Button
              color="primary"
              onClick={() => {
                // TODO: Implement container creation
                console.log("Add container for PR:", row.original._id);
              }}
              variant="contained"
              style={{ marginRight: "8px" }}
            >
              Add Container
            </Button>
          )}
        />
      </div>
    ),
    [containerColumns, handleDeleteContainer, handleSaveContainer]
  );

  return (
    <>
      <MaterialReactTable
        columns={prColumns}
        data={prData}
        enableExpanding
        enableEditing
        editingMode="row"
        enableRowActions
        positionActionsColumn="last"
        renderRowActions={({ row, table }) => (
          <Box sx={{ display: "flex", gap: "1rem" }}>
            <Tooltip title="Edit">
              <IconButton onClick={() => table.setEditingRow(row)}>
                <Edit />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton color="error" onClick={() => handleDeletePr(row)}>
                <Delete />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        onEditingRowSave={handleSavePr}
        renderDetailPanel={renderContainerTable}
        muiTableBodyProps={{
          sx: {
            "& tr:nth-of-type(odd)": {
              backgroundColor: "#f5f5f5",
            },
          },
        }}
        state={{
          isLoading: isLoading || isSaving,
          pagination,
        }}
        manualPagination
        rowCount={totalRows}
        onPaginationChange={setPagination}
        enablePagination
        enableTopToolbar
        renderTopToolbarCustomActions={() => (
          <Button
            color="primary"
            onClick={() => setCreateModalOpen(true)}
            variant="contained"
            startIcon={<Add />}
            disabled={isSaving}
          >
            Add PR
          </Button>
        )}
      />
      <CreatePrModal
        open={createModalOpen}
        onClose={handleCreateModalClose}
        onSave={handleCreatePr}
        prData={newPrData}
        onInputChange={handleInputChange}
        isSaving={isSaving}
      />
    </>
  );
};

export default PRContainer;
