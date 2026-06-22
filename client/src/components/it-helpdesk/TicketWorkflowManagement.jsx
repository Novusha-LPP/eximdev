import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
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
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
  FormControl,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Stack,
} from "@mui/material";
import {
  WorkflowIcon,
  AddIcon,
  EditIcon,
  DeleteIcon,
  PlayArrowIcon,
  SwapVertIcon,
  CheckCircleIcon,
  ReplayIcon,
  CancelIcon,
  ExpandMoreIcon,
  SettingsIcon,
  SaveIcon,
  CloseIcon,
  HistoryIcon,
  TimerIcon,
  AssignmentIcon,
  PersonIcon,
  EmailIcon,
  PhoneIcon,
  AccessTimeIcon,
  PriorityHighIcon,
  CommentIcon,
  AttachFileIcon,
  FilterListIcon,
  ViewColumnIcon,
  TableChartIcon,
} from "@mui/icons-material";

const WORKFLOW_STATUSES = ["New", "Open", "In Progress", "Pending", "Resolved", "Closed"];
const WORKFLOW_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const WORKFLOW_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const WORKFLOW_TYPES = ["Incident", "Service Request", "Problem", "Change Request", "Other"];

export default function TicketWorkflowManagement() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openWorkflowDialog, setOpenWorkflowDialog] = useState(false);
  const [openViewWorkflowDialog, setOpenViewWorkflowDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    status: "Active",
    priority: "Medium",
    category: "Other",
    type: "Incident",
    steps: [],
    conditions: [],
    actions: [],
  });
  const [newStep, setNewStep] = useState({
    name: "",
    description: "",
    status: "",
    assignee: "",
    estimatedTime: "",
    conditions: [],
    actions: [],
  });
  const [activeStep, setActiveStep] = useState(0);

  // Fetch workflows from API
  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the API
      // const response = await itHelpdeskAPI.workflows.getAll();
      // setWorkflows(response.data || []);

      // Mock data for now
      const mockWorkflows = [
        {
          id: "1",
          name: "Hardware Issue Resolution",
          description: "Workflow for resolving hardware-related issues",
          status: "Active",
          priority: "High",
          category: "Hardware",
          type: "Incident",
          steps: [
            {
              id: "1",
              name: "Initial Assessment",
              description: "Assess the hardware issue",
              status: "Completed",
              assignee: "John Doe",
              estimatedTime: "30 minutes",
              conditions: ["Issue reported", "Hardware identified"],
              actions: ["Assign to hardware team"],
            },
            {
              id: "2",
              name: "Diagnosis",
              description: "Diagnose the hardware problem",
              status: "In Progress",
              assignee: "Jane Smith",
              estimatedTime: "2 hours",
              conditions: ["Hardware identified"],
              actions: ["Run diagnostic tests", "Identify root cause"],
            },
            {
              id: "3",
              name: "Resolution",
              description: "Fix the hardware issue",
              status: "Pending",
              assignee: "",
              estimatedTime: "1 hour",
              conditions: ["Root cause identified"],
              actions: ["Replace faulty parts", "Test functionality"],
            },
          ],
          conditions: [],
          actions: [],
        },
        {
          id: "2",
          name: "Software Installation",
          description: "Workflow for installing software",
          status: "Active",
          priority: "Medium",
          category: "Software",
          type: "Service Request",
          steps: [
            {
              id: "1",
              name: "Request Verification",
              description: "Verify the software installation request",
              status: "Completed",
              assignee: "Robert Johnson",
              estimatedTime: "15 minutes",
              conditions: ["Software installation request received"],
              actions: ["Verify request details", "Check license availability"],
            },
            {
              id: "2",
              name: "Software Installation",
              description: "Install the requested software",
              status: "Pending",
              assignee: "",
              estimatedTime: "1 hour",
              conditions: ["Request verified", "License available"],
              actions: ["Download software", "Install software", "Configure settings"],
            },
            {
              id: "3",
              name: "Testing",
              description: "Test the installed software",
              status: "Pending",
              assignee: "",
              estimatedTime: "30 minutes",
              conditions: ["Software installed"],
              actions: ["Run tests", "Verify functionality"],
            },
          ],
          conditions: [],
          actions: [],
        },
      ];
      setWorkflows(mockWorkflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast.error("Failed to fetch workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  // Handle creating a new workflow
  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name || !newWorkflow.description) {
      toast.error("Name and description are required");
      return;
    }

    try {
      // In a real implementation, this would make an API call
      // const response = await itHelpdeskAPI.workflows.create(newWorkflow);
      // toast.success("Workflow created successfully");
      // setOpenWorkflowDialog(false);
      // setNewWorkflow({
      //   name: "",
      //   description: "",
      //   status: "Active",
      //   priority: "Medium",
      //   category: "Other",
      //   type: "Incident",
      //   steps: [],
      //   conditions: [],
      //   actions: [],
      // });
      // fetchWorkflows();

      // Mock implementation
      const mockWorkflow = {
        id: Date.now().toString(),
        ...newWorkflow,
        steps: [],
        conditions: [],
        actions: [],
      };
      setWorkflows([...workflows, mockWorkflow]);
      toast.success("Workflow created successfully");
      setOpenWorkflowDialog(false);
      setNewWorkflow({
        name: "",
        description: "",
        status: "Active",
        priority: "Medium",
        category: "Other",
        type: "Incident",
        steps: [],
        conditions: [],
        actions: [],
      });
    } catch (error) {
      console.error("Error creating workflow:", error);
      toast.error("Failed to create workflow");
    }
  };

  // Handle updating a workflow
  const handleUpdateWorkflow = async () => {
    if (!selectedWorkflow) return;

    try {
      // In a real implementation, this would make an API call
      // const response = await itHelpdeskAPI.workflows.update(selectedWorkflow.id, selectedWorkflow);
      // toast.success("Workflow updated successfully");
      // setOpenViewWorkflowDialog(false);
      // fetchWorkflows();

      // Mock implementation
      const updatedWorkflows = workflows.map(workflow => 
        workflow.id === selectedWorkflow.id ? selectedWorkflow : workflow
      );
      setWorkflows(updatedWorkflows);
      toast.success("Workflow updated successfully");
      setOpenViewWorkflowDialog(false);
    } catch (error) {
      console.error("Error updating workflow:", error);
      toast.error("Failed to update workflow");
    }
  };

  // Handle deleting a workflow
  const handleDeleteWorkflow = async (id) => {
    if (!window.confirm("Are you sure you want to delete this workflow?")) return;

    try {
      // In a real implementation, this would make an API call
      // await itHelpdeskAPI.workflows.remove(id);
      // toast.success("Workflow deleted successfully");
      // fetchWorkflows();
      // if (selectedWorkflow && selectedWorkflow.id === id) {
      //   setOpenViewWorkflowDialog(false);
      // }

      // Mock implementation
      const updatedWorkflows = workflows.filter(workflow => workflow.id !== id);
      setWorkflows(updatedWorkflows);
      toast.success("Workflow deleted successfully");
      if (selectedWorkflow && selectedWorkflow.id === id) {
        setOpenViewWorkflowDialog(false);
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast.error("Failed to delete workflow");
    }
  };

  // Handle adding a step to the workflow
  const handleAddStep = () => {
    if (!newStep.name || !newStep.description) {
      toast.error("Step name and description are required");
      return;
    }

    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: [...selectedWorkflow.steps, { ...newStep, id: Date.now().toString() }],
    };

    setSelectedWorkflow(updatedWorkflow);
    setNewStep({
      name: "",
      description: "",
      status: "",
      assignee: "",
      estimatedTime: "",
      conditions: [],
      actions: [],
    });
  };

  // Handle removing a step from the workflow
  const handleRemoveStep = (stepId) => {
    if (!selectedWorkflow) return;

    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: selectedWorkflow.steps.filter(step => step.id !== stepId),
    };

    setSelectedWorkflow(updatedWorkflow);
  };

  // Handle step status change
  const handleStepStatusChange = (stepId, newStatus) => {
    if (!selectedWorkflow) return;

    const updatedSteps = selectedWorkflow.steps.map(step => 
      step.id === stepId ? { ...step, status: newStatus } : step
    );

    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: updatedSteps,
    };

    setSelectedWorkflow(updatedWorkflow);
  };

  return (
    <Box p={3}>
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700}>
              Ticket Workflow Management
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setOpenWorkflowDialog(true)}
            >
              Create Workflow
            </Button>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {workflows.map((workflow) => (
                <Grid item xs={12} md={6} key={workflow.id}>
                  <Card sx={{ boxShadow: 2, cursor: "pointer" }} onClick={() => {
                    setSelectedWorkflow(workflow);
                    setOpenViewWorkflowDialog(true);
                  }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight={600}>
                          {workflow.name}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={workflow.status}
                            color={workflow.status === "Active" ? "success" : "default"}
                            size="small"
                          />
                          <Chip
                            label={workflow.priority}
                            color={
                              workflow.priority === "Critical" ? "error" :
                              workflow.priority === "High" ? "warning" :
                              workflow.priority === "Medium" ? "info" : "success"
                            }
                            size="small"
                          />
                        </Stack>
                      </Box>
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {workflow.description}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Typography variant="caption" color="text.secondary">
                          Steps: {workflow.steps.length}
                        </Typography>
                        <Divider orientation="vertical" flexItem />
                        <Typography variant="caption" color="text.secondary">
                          Category: {workflow.category}
                        </Typography>
                        <Divider orientation="vertical" flexItem />
                        <Typography variant="caption" color="text.secondary">
                          Type: {workflow.type}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Last updated: {new Date().toLocaleDateString()}
                        </Typography>
                        <Box>
                          <Tooltip title="View Workflow">
                            <IconButton size="small">
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Workflow">
                            <IconButton size="small" color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Workflow Dialog */}
      <Dialog open={openWorkflowDialog} onClose={() => setOpenWorkflowDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedWorkflow ? "Edit Workflow" : "Create New Workflow"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Workflow Name"
                required
                size="small"
                fullWidth
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow(w => ({ ...w, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                required
                size="small"
                fullWidth
                multiline
                minRows={3}
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow(w => ({ ...w, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={newWorkflow.status}
                  onChange={(e) => setNewWorkflow(w => ({ ...w, status: e.target.value }))}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Draft">Draft</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newWorkflow.priority}
                  onChange={(e) => setNewWorkflow(w => ({ ...w, priority: e.target.value }))}
                >
                  {WORKFLOW_PRIORITIES.map(p => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={newWorkflow.category}
                  onChange={(e) => setNewWorkflow(w => ({ ...w, category: e.target.value }))}
                >
                  {WORKFLOW_CATEGORIES.map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={newWorkflow.type}
                  onChange={(e) => setNewWorkflow(w => ({ ...w, type: e.target.value }))}
                >
                  {WORKFLOW_TYPES.map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWorkflowDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateWorkflow}>
            {selectedWorkflow ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Workflow Dialog */}
      <Dialog open={openViewWorkflowDialog} onClose={() => setOpenViewWorkflowDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedWorkflow?.name}</Typography>
            <Box>
              <Tooltip title="Edit Workflow">
                <IconButton size="small" onClick={() => {}}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Workflow">
                <IconButton size="small" color="error" onClick={() => handleDeleteWorkflow(selectedWorkflow?.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton size="small" onClick={() => setOpenViewWorkflowDialog(false)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {selectedWorkflow?.description}
          </Typography>

          <Typography variant="h6" fontWeight={600} mb={2}>
            Workflow Steps
          </Typography>

          <Stepper orientation="vertical" nonLinear>
            {selectedWorkflow?.steps.map((step, index) => (
              <Step key={step.id} active={step.status === "In Progress"} completed={step.status === "Completed"}>
                <StepLabel>
                  <Box>
                    <Typography variant="subtitle2">{step.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{step.description}</Typography>
                  </Box>
                </StepLabel>
                <StepContent>
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" fontWeight={600}>Status:</Typography>
                        <Select
                          size="small"
                          value={step.status}
                          onChange={(e) => handleStepStatusChange(step.id, e.target.value)}
                          sx={{ minWidth: 120 }}
                        >
                          {WORKFLOW_STATUSES.map(s => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                          ))}
                        </Select>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" fontWeight={600}>Assignee:</Typography>
                        <TextField
                          size="small"
                          fullWidth
                          value={step.assignee}
                          onChange={(e) => {
                            const updatedSteps = selectedWorkflow.steps.map(s => 
                              s.id === step.id ? { ...s, assignee: e.target.value } : s
                            );
                            setSelectedWorkflow({ ...selectedWorkflow, steps: updatedSteps });
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" fontWeight={600}>Estimated Time:</Typography>
                        <TextField
                          size="small"
                          fullWidth
                          value={step.estimatedTime}
                          onChange={(e) => {
                            const updatedSteps = selectedWorkflow.steps.map(s => 
                              s.id === step.id ? { ...s, estimatedTime: e.target.value } : s
                            );
                            setSelectedWorkflow({ ...selectedWorkflow, steps: updatedSteps });
                          }}
                        />
                      </Grid>
                    </Grid>

                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                      <Button size="small" color="error" onClick={() => handleRemoveStep(step.id)}>
                        Remove Step
                      </Button>
                      <Box>
                        <Button size="small" onClick={() => {}}>
                          Save Changes
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button variant="contained" onClick={handleUpdateWorkflow}>
              Save Workflow
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
