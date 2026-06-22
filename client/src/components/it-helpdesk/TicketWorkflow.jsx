import React, { useState } from "react";
import { toast } from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const TICKET_STATUSES = ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed"];

const statusColor = (s) => {
  switch (s) {
    case "New":
      return "error";
    case "Assigned":
      return "info";
    case "In Progress":
      return "warning";
    case "Pending":
      return "default";
    case "Resolved":
      return "success";
    case "Closed":
      return "success";
    default:
      return "default";
  }
};

export default function TicketWorkflow({ workflowSteps, setWorkflowSteps }) {
  const [showModal, setShowModal] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "New",
    next_status: "",
    required_fields: [],
    optional_fields: [],
    actions: [],
    conditions: [],
  });

  const handleSave = () => {
    if (editingStep) {
      // Update existing workflow step
      setWorkflowSteps(workflowSteps.map(step => 
        step.id === editingStep.id ? { ...form, id: editingStep.id } : step
      ));
      toast.success("Workflow step updated");
    } else {
      // Add new workflow step
      setWorkflowSteps([...workflowSteps, { ...form, id: Date.now() }]);
      toast.success("Workflow step added");
    }
    setShowModal(false);
    setEditingStep(null);
    setForm({
      name: "",
      description: "",
      status: "New",
      next_status: "",
      required_fields: [],
      optional_fields: [],
      actions: [],
      conditions: [],
    });
  };

  const handleEdit = (step) => {
    setEditingStep(step);
    setForm({
      name: step.name,
      description: step.description,
      status: step.status,
      next_status: step.next_status,
      required_fields: step.required_fields || [],
      optional_fields: step.optional_fields || [],
      actions: step.actions || [],
      conditions: step.conditions || [],
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this workflow step?")) {
      setWorkflowSteps(workflowSteps.filter(step => step.id !== id));
      toast.success("Workflow step deleted");
    }
  };

  // Build workflow visualization
  const buildWorkflowVisualization = () => {
    const statusMap = {};
    workflowSteps.forEach(step => {
      if (!statusMap[step.status]) {
        statusMap[step.status] = [];
      }
      statusMap[step.status].push(step);
    });

    const sortedStatuses = Object.keys(statusMap).sort((a, b) => {
      return TICKET_STATUSES.indexOf(a) - TICKET_STATUSES.indexOf(b);
    });

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>Workflow Visualization</Typography>
        <Stepper orientation="horizontal" alternativeLabel>
          {sortedStatuses.map(status => (
            <Step key={status}>
              <StepLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip label={status} color={statusColor(status)} size="small" />
                  <Typography variant="body2">{statusMap[status].length} steps</Typography>
                </Box>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <AccountTreeIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Ticket Workflow
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowModal(true)}>
          Add Workflow Step
        </Button>
      </Box>

      {buildWorkflowVisualization()}

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Step Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Next Status</TableCell>
                  <TableCell>Required Fields</TableCell>
                  <TableCell>Actions</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workflowSteps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No workflow steps found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  workflowSteps.map((step) => (
                    <TableRow key={step.id}>
                      <TableCell>
                        <Chip label={step.status} color={statusColor(step.status)} size="small" />
                      </TableCell>
                      <TableCell>{step.name}</TableCell>
                      <TableCell>{step.description}</TableCell>
                      <TableCell>{step.next_status || "N/A"}</TableCell>
                      <TableCell>
                        {step.required_fields?.join(", ") || "N/A"}
                      </TableCell>
                      <TableCell>
                        {step.actions?.join(", ") || "N/A"}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(step)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(step.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Workflow Step Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingStep ? "Edit Workflow Step" : "Add Workflow Step"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Step Name"
                required
                size="small"
                fullWidth
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Status"
                size="small"
                fullWidth
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {TICKET_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Next Status"
                size="small"
                fullWidth
                value={form.next_status}
                onChange={(e) => setForm((f) => ({ ...f, next_status: e.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {TICKET_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Required Fields (comma separated)"
                size="small"
                fullWidth
                value={form.required_fields?.join(", ") || ""}
                onChange={(e) => setForm((f) => ({ ...f, required_fields: e.target.value.split(",").map(s => s.trim()).filter(s => s) }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Actions (comma separated)"
                size="small"
                fullWidth
                value={form.actions?.join(", ") || ""}
                onChange={(e) => setForm((f) => ({ ...f, actions: e.target.value.split(",").map(s => s.trim()).filter(s => s) }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.name}>
            {editingStep ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
