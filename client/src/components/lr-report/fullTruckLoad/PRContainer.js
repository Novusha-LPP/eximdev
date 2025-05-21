import { useEffect, useState, useCallback, useMemo } from "react";
import { MaterialReactTable } from "material-react-table";
import { Button } from "@mui/material";
import { Add } from "@mui/icons-material";
import { CreatePrModal, INITIAL_PR_DATA } from "./CreatePrModal";
import ContainerModal, { INITIAL_CONTAINER_DATA } from "./ContainerModal";
import * as prService from "../../../services/prService";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";

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
  const [editingPr, setEditingPr] = useState(null);
  // Add state for container modal
  const [containerModalOpen, setContainerModalOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [containerData, setContainerData] = useState(INITIAL_CONTAINER_DATA);
  // Add selectedPrId state
  const [selectedPrId, setSelectedPrId] = useState(null);

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
    setEditingPr(null);
    setNewPrData(INITIAL_PR_DATA);
  };

  const handleSavePr = async () => {
    setIsSaving(true);
    try {
      if (editingPr) {
        await prService.updatePrData(editingPr._id, newPrData);
      } else {
        await prService.createPr(newPrData);
      }
      await getPrData(pagination.pageIndex + 1, pagination.pageSize);
      handleCreateModalClose();
      alert(editingPr ? "PR updated successfully" : "PR created successfully");
    } catch (error) {
      console.error("Error saving PR:", error);
      alert("Failed to save PR. Please try again.");
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
        Pin: "left",
        size: 150,
      },
      {
        accessorKey: "pr_date",
        header: "PR Date",
        enableEditing: true,
      },
      {
        accessorKey: "branch",
        header: "Branch",
        enableEditing: true,
      },
      {
        accessorKey: "consignor",
        header: "Consignor",
        enableEditing: true,
      },
      {
        accessorKey: "consignee",
        header: "Consignee",
        enableEditing: true,
      },
      {
        accessorKey: "container_type",
        header: "Container Type",
        enableEditing: true,
      },
      {
        accessorKey: "container_count",
        header: "Container Count",
        enableEditing: true,
      },
      {
        accessorKey: "type_of_vehicle",
        header: "Vehicle Type",
        enableEditing: true,
      },
      {
        accessorKey: "description",
        header: "Description",
        enableEditing: true,
      },
      {
        accessorKey: "shipping_line",
        header: "Shipping Line",
        enableEditing: true,
      },
      {
        accessorKey: "container_loading",
        header: "Container Loading",
        enableEditing: true,
      },
      {
        accessorKey: "container_offloading",
        header: "Container Offloading",
        enableEditing: true,
      },
      {
        accessorKey: "do_validity",
        header: "DO Validity",
        enableEditing: true,
      },
      {
        accessorKey: "instructions",
        header: "Instructions",
        enableEditing: true,
      },
      {
        accessorKey: "document_no",
        header: "Document No",
        enableEditing: true,
      },
      {
        accessorKey: "document_date",
        header: "Document Date",
        enableEditing: true,
      },
      {
        accessorKey: "goods_pickup",
        header: "Goods Pickup",
        enableEditing: true,
      },
      {
        accessorKey: "goods_delivery",
        header: "Goods Delivery",
        enableEditing: true,
      },
      {
        accessorKey: "import_export",
        header: "Import/Export",
        enableEditing: true,
      },
    ],
    []
  );

  // Define columns for Container (child rows)
  const containerColumns = useMemo(
    () => [
      {
        accessorKey: "tr_no",
        header: "Container No",
        enableEditing: true,
        Pin: "left",
        size: 150,
      },
      {
        accessorKey: "container_type",
        header: "Container Type",
        enableEditing: true,
      },
      {
        accessorKey: "seal_no",
        header: "Seal No",
        enableEditing: true,
      },
      {
        accessorKey: "goods_description",
        header: "Goods Description",
        enableEditing: true,
      },
      {
        accessorKey: "hs_code",
        header: "HS Code",
        enableEditing: true,
      },
      {
        accessorKey: "container_weight",
        header: "Container Weight",
        enableEditing: true,
      },
      {
        accessorKey: "weight_unit",
        header: "Weight Unit",
        enableEditing: true,
      },
      {
        accessorKey: "volume",
        header: "Volume",
        enableEditing: true,
      },
      {
        accessorKey: "volume_unit",
        header: "Volume Unit",
        enableEditing: true,
      },
      {
        accessorKey: "pickup_location",
        header: "Pickup Location",
        enableEditing: true,
      },
      {
        accessorKey: "delivery_location",
        header: "Delivery Location",
        enableEditing: true,
      },
      {
        accessorKey: "transportation_mode",
        header: "Transportation Mode",
        enableEditing: true,
      },
      {
        accessorKey: "driver_name",
        header: "Driver Name",
        enableEditing: true,
      },
      {
        accessorKey: "driver_contact",
        header: "Driver Contact",
        enableEditing: true,
      },
      {
        accessorKey: "vehicle_no",
        header: "Vehicle No",
        enableEditing: true,
      },
      {
        accessorKey: "eta",
        header: "ETA",
        enableEditing: true,
      },
      {
        accessorKey: "etd",
        header: "ETD",
        enableEditing: true,
      },
      {
        accessorKey: "instructions",
        header: "Instructions",
        enableEditing: true,
      },
    ],
    []
  );

  // Add PR row actions for Edit and Delete
  const renderRowActions = ({ row }) => (
    <Box sx={{ display: "flex", gap: "1rem" }}>
      <Tooltip title="Edit">
        <IconButton
          onClick={() => {
            setEditingPr(row.original);
            setNewPrData(row.original);
            setCreateModalOpen(true);
          }}
        >
          <Edit />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton color="error" onClick={() => handleDeletePr(row)}>
          <Delete />
        </IconButton>
      </Tooltip>
    </Box>
  );

  // Handler to open modal for add/edit container
  const handleOpenContainerModal = (container = null) => {
    setEditingContainer(container);
    setContainerData(container || INITIAL_CONTAINER_DATA);
    setContainerModalOpen(true);
  };

  const handleCloseContainerModal = () => {
    setContainerModalOpen(false);
    setEditingContainer(null);
    setContainerData(INITIAL_CONTAINER_DATA);
  };

  const handleContainerInputChange = (field) => (event) => {
    setContainerData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSaveContainerModal = async () => {
    setIsSaving(true);
    try {
      // You need to know the PR id to which this container belongs
      // For now, assume you have selectedPrId in state (add as needed)
      if (editingContainer) {
        await prService.updateContainerData(selectedPrId, containerData);
      } else {
        await prService.updateContainerData(selectedPrId, containerData); // Or a createContainer API if available
      }
      await getPrData(pagination.pageIndex + 1, pagination.pageSize);
      handleCloseContainerModal();
      alert(
        editingContainer
          ? "Container updated successfully"
          : "Container added successfully"
      );
    } catch (error) {
      console.error("Error saving container:", error);
      alert("Failed to save container. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // In renderDetailPanel, pass a function that opens the modal for add/edit
  const renderDetailPanel = ({ row }) => (
    <>
      <MaterialReactTable
        columns={containerColumns}
        data={row.original.containers || []}
        enableEditing
        editingMode="row"
        enableRowActions
        positionActionsColumn="first"
        displayColumnDefOptions={{
          "mrt-row-actions": {
            Pin: "left",
            size: 80,
          },
        }}
        initialState={{
          columnPinning: {
            left: ["mrt-row-actions", "tr_no"],
          },
        }}
        renderRowActions={({ row: containerRow, table }) => (
          <Box sx={{ display: "flex", gap: "1rem" }}>
            <Tooltip title="Edit">
              <IconButton
                onClick={() => {
                  setSelectedPrId(row.original._id);
                  handleOpenContainerModal(containerRow.original);
                }}
              >
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
              setSelectedPrId(row.original._id);
              handleOpenContainerModal();
            }}
            variant="contained"
            style={{ marginRight: "8px" }}
          >
            Add Container
          </Button>
        )}
      />
      <ContainerModal
        open={containerModalOpen}
        onClose={handleCloseContainerModal}
        onSave={handleSaveContainerModal}
        containerData={containerData}
        onInputChange={handleContainerInputChange}
        isSaving={isSaving}
        title={editingContainer ? "Edit LR Container" : "Add LR Container"}
      />
    </>
  );

  return (
    <>
      <MaterialReactTable
        columns={prColumns}
        data={prData}
        enableExpanding
        enableEditing={false}
        enableRowActions
        enablePinning
        positionActionsColumn="first"
        displayColumnDefOptions={{
          "mrt-row-actions": {
            Pin: "left",
            size: 100,
          },
        }}
        initialState={{
          columnPinning: {
            left: ["mrt-row-actions", "pr_no"],
          },
        }}
        renderRowActions={renderRowActions}
        muiTableBodyProps={{
          sx: {
            "& tr:nth-of-type(odd)": {
              backgroundColor: "#f5f5f5",
            },
          },
        }}
        muiTableContainerProps={{
          sx: {
            maxHeight: "600px",
          },
        }}
        state={{
          isLoading: isLoading || isSaving,
          pagination,
        }}
        manualPagination={true}
        rowCount={totalRows}
        onPaginationChange={setPagination}
        enablePagination={true}
        enableTopToolbar={true}
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
        renderDetailPanel={renderDetailPanel}
      />
      <CreatePrModal
        open={createModalOpen}
        onClose={handleCreateModalClose}
        onSave={handleSavePr}
        prData={newPrData}
        onInputChange={handleInputChange}
        isSaving={isSaving}
        title={editingPr ? "Edit PR" : "New PR"}
      />
    </>
  );
};

export default PRContainer;
