import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Badge,
  Tooltip,
  Stack,
} from "@mui/material";
import {
  Search,
  Visibility,
  Edit,
  AccountCircle,
  Business,
  CalendarToday,
  Warning,
  CheckCircle,
  Error,
} from "@mui/icons-material";

const MasterEntriesView = () => {
  const [masterTypes, setMasterTypes] = useState([]);
  const [masterEntries, setMasterEntries] = useState([]);
  const [selectedMasterType, setSelectedMasterType] = useState("");
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchMasterTypes();
    fetchMasterEntries();
  }, []);

  useEffect(() => {
    if (selectedMasterType && masterEntries.length > 0) {
      const filtered = masterEntries.filter(
        (entry) => entry.masterTypeName === selectedMasterType
      );
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries([]);
    }
  }, [selectedMasterType, masterEntries]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = masterEntries.filter(
        (entry) =>
          entry.masterTypeName === selectedMasterType &&
          (entry.defaultFields.companyName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
            entry.defaultFields.address
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
      setFilteredEntries(filtered);
    } else if (selectedMasterType) {
      const filtered = masterEntries.filter(
        (entry) => entry.masterTypeName === selectedMasterType
      );
      setFilteredEntries(filtered);
    }
  }, [searchTerm, selectedMasterType, masterEntries]);

  const fetchMasterTypes = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/master-types`
      );
      const data = await response.json();
      setMasterTypes(data);
    } catch (error) {
      console.error("Error fetching master types:", error);
    }
  };

  const fetchMasterEntries = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/masters`
      );
      const data = await response.json();
      setMasterEntries(data);
    } catch (error) {
      console.error("Error fetching master entries:", error);
    }
  };

  const handleMasterTypeChange = (event) => {
    setSelectedMasterType(event.target.value);
    setSearchTerm("");
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Fixed: Better date validation and formatting
  const isValidDate = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const formatDate = (dateString) => {
    if (!dateString || !isValidDate(dateString)) return "Not set";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  // Fixed: Proper date comparison with timezone handling
  const getDaysUntilDue = (dueDate) => {
    if (!dueDate || !isValidDate(dueDate)) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Fixed: Better status logic that only shows overdue for past dates
  // Fixed: Only show overdue if billing date is NOT available
  const getStatusColor = (dueDate, billingDate) => {
    if (!dueDate) return "default";
    if (billingDate) return "success"; // Show success/green if billed

    const daysUntilDue = getDaysUntilDue(dueDate);
    if (daysUntilDue === null) return "default";
    if (daysUntilDue < 0) return "error";
    if (daysUntilDue <= 7) return "warning";
    return "success";
  };

  const getStatusText = (dueDate, billingDate) => {
    if (!dueDate) return "No due date";
    if (billingDate) return "Billed";

    const daysUntilDue = getDaysUntilDue(dueDate);
    if (daysUntilDue === null) return "Invalid date";
    if (daysUntilDue < 0) return `Overdue ${Math.abs(daysUntilDue)}d`;
    if (daysUntilDue === 0) return "Due today";
    if (daysUntilDue <= 7) return `${daysUntilDue}d left`;
    return `${daysUntilDue}d left`;
  };

  const getStatusIcon = (dueDate, billingDate) => {
    if (billingDate) return <CheckCircle />;
    if (!dueDate || !isValidDate(dueDate)) return <CheckCircle />;

    const daysUntilDue = getDaysUntilDue(dueDate);
    if (daysUntilDue === null) return <CheckCircle />;
    if (daysUntilDue < 0) return <Error />;
    if (daysUntilDue <= 7) return <Warning />;
    return <CheckCircle />;
  };

  const handleViewEntry = (entry) => {
    // Add your view logic here
  };

  const handleEditEntry = (entry) => {
    // Add your edit logic here
  };

  // Get initials for company avatar
  const getCompanyInitials = (companyName) => {
    return (
      companyName
        ?.split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "??"
    );
  };

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        maxWidth: 1600,
        mx: "auto",
        bgcolor: "#fafbfc",
        minHeight: "100vh",
        fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
      }}
    >
      {/* Header with circular accent */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
          position: "relative",
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(102, 126, 234, 0.25)",
          }}
        >
          <Business sx={{ color: "white", fontSize: 24 }} />
        </Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "#1a202c",
            letterSpacing: "-0.025em",
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
          }}
        >
          Master Records
        </Typography>
      </Box>

      {/* Compact Control Panel */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 4,
          border: "1px solid #e2e8f0",
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 220 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#667eea",
                  },
                },
              }}
            >
              <InputLabel>Master Type</InputLabel>
              <Select
                value={selectedMasterType}
                label="Master Type"
                onChange={handleMasterTypeChange}
              >
                {masterTypes.map((type) => (
                  <MenuItem key={type.name} value={type.name}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#667eea",
                        }}
                      />
                      {type.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "#64748b" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: { xs: "100%", sm: 280 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#667eea",
                  },
                },
              }}
              disabled={!selectedMasterType}
            />

            {selectedMasterType && (
              <Chip
                icon={
                  <Badge
                    badgeContent={filteredEntries.length}
                    color="primary"
                  />
                }
                label={`${filteredEntries.length} entries`}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  fontWeight: 600,
                  ml: "auto",
                }}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Results Section */}
      {selectedMasterType && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {filteredEntries.length === 0 ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <Search sx={{ fontSize: 40, color: "#64748b" }} />
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 1, color: "#1a202c" }}
              >
                {searchTerm ? "No matches found" : "No entries available"}
              </Typography>
              <Typography color="text.secondary">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "No entries found for this master type"}
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 650 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: "#f8fafc",
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                        py: 2,
                      }}
                    >
                      Company
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: "#f8fafc",
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      Location
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: "#f8fafc",
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      Billing Date
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: "#f8fafc",
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      Due Date
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: "#f8fafc",
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: "#f8fafc",
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                        width: 120,
                      }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEntries.map((entry, index) => {
                    const daysUntilDue = getDaysUntilDue(
                      entry.defaultFields.dueDate
                    );
                    const statusColor = getStatusColor(
                      entry.defaultFields.dueDate,
                      entry.defaultFields.billingDate
                    );
                    const statusText = getStatusText(
                      entry.defaultFields.dueDate,
                      entry.defaultFields.billingDate
                    );

                    return (
                      <TableRow
                        key={entry._id}
                        hover
                        sx={{
                          "&:hover": {
                            bgcolor: "#f8fafc",
                            transform: "translateY(-1px)",
                            transition: "all 0.2s ease",
                          },
                          cursor: "pointer",
                        }}
                      >
                        <TableCell sx={{ py: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: "#667eea",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              {getCompanyInitials(
                                entry.defaultFields.companyName
                              )}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, color: "#1a202c" }}
                              >
                                {entry.defaultFields.companyName}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                ID: #{index + 1}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {entry.defaultFields.address || "Not provided"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <CalendarToday
                              sx={{ fontSize: 14, color: "#64748b" }}
                            />
                            <Typography variant="body2">
                              {formatDate(entry.defaultFields.billingDate)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <CalendarToday
                              sx={{ fontSize: 14, color: "#64748b" }}
                            />
                            <Typography variant="body2">
                              {formatDate(entry.defaultFields.dueDate)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={getStatusIcon(entry.defaultFields.dueDate)}
                            label={statusText}
                            color={statusColor}
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.7rem",
                              borderRadius: 3,
                              "& .MuiChip-icon": { fontSize: 14 },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewEntry(entry)}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  bgcolor: "#f0f9ff",
                                  color: "#0369a1",
                                  "&:hover": {
                                    bgcolor: "#e0f2fe",
                                    transform: "scale(1.1)",
                                  },
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Entry">
                              <IconButton
                                size="small"
                                onClick={() => handleEditEntry(entry)}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  bgcolor: "#fff7ed",
                                  color: "#ea580c",
                                  "&:hover": {
                                    bgcolor: "#fed7aa",
                                    transform: "scale(1.1)",
                                  },
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      )}

      {/* No Selection State */}
      {!selectedMasterType && (
        <Card
          elevation={0}
          sx={{
            p: 8,
            textAlign: "center",
            borderRadius: 4,
            border: "2px dashed #e2e8f0",
            background: "white",
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
              boxShadow: "0 20px 40px rgba(102, 126, 234, 0.2)",
            }}
          >
            <AccountCircle sx={{ fontSize: 60, color: "white" }} />
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, mb: 2, color: "#1a202c" }}
          >
            Select Master Type
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              fontSize: "1rem",
              maxWidth: 500,
              mx: "auto",
              lineHeight: 1.6,
            }}
          >
            Choose a master type from the dropdown above to view and manage your
            business records in a clean, organized format.
          </Typography>
        </Card>
      )}
    </Box>
  );
};

export default MasterEntriesView;
