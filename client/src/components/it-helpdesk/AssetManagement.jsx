import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import axios from "axios";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import Inventory2Icon from "@mui/icons-material/Inventory2";

const ASSET_TYPES = ["Desktop", "Laptop", "Printer", "Network Device", "Software", "Phone", "SIM Card", "Rack", "Cable"];
const STATUSES = ["Available", "Assigned", "In Repair", "Repair", "Retired", "Lost", "Active", "Inactive", "Damaged", "Spare", "Expired", "Suspended"];
const SERVICE_PROVIDERS = ["Airtel", "Jio", "Vi", "BSNL"];
const PLAN_TYPES = ["Prepaid", "Postpaid"];
const PRINTER_TYPES = ["Laser", "Inkjet", "Thermal", "Dot Matrix"];
const CONNECTION_TYPES = ["USB", "Wi-Fi", "LAN"];
const DEVICE_CATEGORIES = ["Router", "Switch", "Firewall", "AP"];
const USERS_FETCH_LIMIT = 200;

const FIELD_LABELS = {
  asset_tag: "Asset Tag",
  serial_number: "Serial Number",
  asset_type: "Asset Type",
  manufacturer: "Manufacturer",
  model: "Model",
  purchase_date: "Purchase Date",
  warranty_expiry: "Warranty Expiry",
  status: "Status",
  assigned_to: "Assigned To",
  assigned_date: "Assigned Date",
  location: "Location",
  purchase_cost: "Purchase Cost",
  vendor: "Vendor",
  description: "Description",
  asset_name: "Asset Name",
  processor: "Processor",
  ram: "RAM",
  storage: "Storage",
  operating_system: "Operating System",
  device_name: "Device Name",
  device_category: "Device Category",
  ip_address: "IP Address",
  mac_address: "MAC Address",
  software_category: "Software Category",
  version: "Version",
  license_type: "License Type",
  license_key_subscription_id: "License Key / Subscription ID",
  number_of_licenses: "Number of Licenses",
  expiry_renewal_date: "Expiry/Renewal Date",
  imei_number: "IMEI Number",
  rack_name: "Rack Name/Number",
  rack_type: "Rack Type",
  rack_size_u_height: "Rack Size (U Height)",
  installation_date: "Installation Date",
  cable_name: "Cable Name",
  cable_type: "Cable Type",
  length: "Length",
  printer_type: "Printer Type",
  connection_type: "Connection Type",
  sim_number_iccid: "SIM Number",
  mobile_number: "Mobile Number",
  imsi_number: "IMSI Number",
  puk_code: "PUK Code",
  service_provider: "Service Provider",
  department: "Department",
  allocation_date: "Assigned Date",
  plan_type: "Plan Type",
  monthly_plan_package: "Monthly Plan/Package",
  remarks: "Remarks",
};

const ASSET_TYPE_REQUIRED_FIELDS = {
  Desktop: ["asset_tag", "asset_name", "manufacturer", "model", "serial_number", "processor", "ram", "storage", "operating_system", "assigned_to", "department", "location", "status", "purchase_date"],
  Laptop: ["asset_tag", "asset_name", "manufacturer", "model", "serial_number", "processor", "ram", "storage", "operating_system", "assigned_to", "department", "location", "status", "purchase_date"],
  Printer: ["asset_tag", "asset_name", "manufacturer", "model", "serial_number", "printer_type", "connection_type", "location", "assigned_to", "department", "status", "purchase_date"],
  "Network Device": ["asset_tag", "asset_name", "device_category", "manufacturer", "model", "serial_number", "ip_address", "mac_address", "location", "status"],
  Software: ["asset_tag", "asset_name", "software_category", "version", "license_type", "license_key_subscription_id", "vendor", "number_of_licenses", "assigned_to", "department", "status", "purchase_date", "expiry_renewal_date"],
  Phone: ["asset_tag", "manufacturer", "model", "imei_number", "serial_number", "mobile_number", "assigned_to", "department", "status", "purchase_date", "location"],
  "SIM Card": ["asset_tag", "sim_number_iccid", "mobile_number", "service_provider", "assigned_to", "department", "status", "allocation_date", "plan_type", "monthly_plan_package"],
  Rack: ["asset_tag", "rack_name", "rack_type", "location", "rack_size_u_height", "manufacturer", "status", "installation_date"],
  Cable: ["asset_tag", "cable_name", "cable_type", "length", "location", "status", "purchase_date"],
};

const getRequiredFieldsForType = (assetType) => {
  const base = ASSET_TYPE_REQUIRED_FIELDS[assetType] || ASSET_TYPE_REQUIRED_FIELDS.Laptop;
  return base.map((field) => (field === "status" ? "status" : field));
};

const getMissingRequiredFields = (assetForm) => getRequiredFieldsForType(assetForm.asset_type).filter((field) => {
  const value = assetForm[field];
  return value === undefined || value === null || value === "";
});

const STATUS_NORMALIZATION_MAP = {
  active: "Active",
  assigned: "Assigned",
  available: "Available",
  "in repair": "In Repair",
  repair: "Repair",
  retired: "Retired",
  lost: "Lost",
  inactive: "Inactive",
  damaged: "Damaged",
  spare: "Spare",
  expired: "Expired",
  suspended: "Suspended",
};

const PLAN_TYPE_MAP = {
  prepaid: "Prepaid",
  postpaid: "Postpaid",
};

const normalizeStatus = (status) => STATUS_NORMALIZATION_MAP[String(status || "").toLowerCase()] || status;
const normalizePlanType = (planType) => PLAN_TYPE_MAP[String(planType || "").toLowerCase()] || planType;

const EMPTY_FORM = {
  asset_tag: "",
  serial_number: "",
  asset_type: "Laptop",
  manufacturer: "",
  model: "",
  purchase_date: "",
  warranty_expiry: "",
  status: "Available",
  assigned_to: "",
  assigned_date: "",
  location: "",
  purchase_cost: "",
  vendor: "",
  description: "",
  asset_name: "",
  processor: "",
  ram: "",
  storage: "",
  operating_system: "",
  device_category: "",
  ip_address: "",
  mac_address: "",
  software_category: "",
  version: "",
  license_type: "",
  license_key_subscription_id: "",
  number_of_licenses: "",
  expiry_renewal_date: "",
  imei_number: "",
  rack_name: "",
  rack_type: "",
  rack_size_u_height: "",
  installation_date: "",
  cable_name: "",
  cable_type: "",
  length: "",
  printer_type: "",
  connection_type: "",
  sim_number_iccid: "",
  mobile_number: "",
  imsi_number: "",
  puk_code: "",
  service_provider: "",
  department: "",
  allocation_date: "",
  plan_type: "",
  monthly_plan_package: "",
  remarks: "",
};

export default function AssetManagement() {
  const [data, setData] = useState([]);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "", status: "" });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25 });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, limit: pagination.limit };
        if (filters.type) params.type = filters.type;
        if (filters.status) params.status = filters.status;

        const res = await itHelpdeskAPI.assets.getAll(params);
        setData(res.data || []);
        setPagination(res.pagination || { total: 0, page: 1, limit: params.limit });
      } catch (err) {
        toast.error("Failed to load assets");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`, {
        withCredentials: true,
        params: { limit: USERS_FETCH_LIMIT },
      });
      setUsers(res.data || []);
      console.log("Fetched users:", res.data?.length || 0);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await itHelpdeskAPI.vendors.getAll();
      setVendors(res.data || []);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  useEffect(() => {
    fetchUsers();
    fetchVendors();
  }, [fetchUsers, fetchVendors]);

  const handleOpen = (record = null) => {
    if (record) {
      setEditId(record._id);
      setErrors({});
      setForm({
        asset_tag: record.asset_tag || "",
        serial_number: record.serial_number || "",
        asset_type: record.asset_type || "Laptop",
        manufacturer: record.manufacturer || "",
        model: record.model || "",
        purchase_date: record.purchase_date ? record.purchase_date.slice(0, 10) : "",
        warranty_expiry: record.warranty_expiry ? record.warranty_expiry.slice(0, 10) : "",
        status: record.status || "Available",
        assigned_to: record.assigned_to?._id || record.assigned_to || "",
        assigned_date: record.assigned_date ? record.assigned_date.slice(0, 10) : "",
        location: record.location || "",
        purchase_cost: record.purchase_cost ?? "",
        vendor: record.vendor?._id || record.vendor || "",
        description: record.description || "",
        asset_name: record.asset_name || "",
        processor: record.processor || "",
        ram: record.ram || "",
        storage: record.storage || "",
        operating_system: record.operating_system || "",
        device_category: record.device_category || "",
        ip_address: record.ip_address || "",
        mac_address: record.mac_address || "",
        software_category: record.software_category || "",
        version: record.version || "",
        license_type: record.license_type || "",
        license_key_subscription_id: record.license_key_subscription_id || "",
        number_of_licenses: record.number_of_licenses ?? "",
        expiry_renewal_date: record.expiry_renewal_date ? record.expiry_renewal_date.slice(0, 10) : "",
        imei_number: record.imei_number || "",
        rack_name: record.rack_name || "",
        rack_type: record.rack_type || "",
        rack_size_u_height: record.rack_size_u_height || "",
        installation_date: record.installation_date ? record.installation_date.slice(0, 10) : "",
        cable_name: record.cable_name || "",
        cable_type: record.cable_type || "",
        length: record.length || "",
        printer_type: record.printer_type || "",
        connection_type: record.connection_type || "",
        sim_number_iccid: record.sim_number_iccid || "",
        mobile_number: record.mobile_number || "",
        imsi_number: record.imsi_number || "",
        puk_code: record.puk_code || "",
        service_provider: record.service_provider || "",
        department: record.department || "",
        allocation_date: record.allocation_date ? record.allocation_date.slice(0, 10) : "",
        plan_type: record.plan_type || "",
        monthly_plan_package: record.monthly_plan_package || "",
        remarks: record.remarks || "",
      });
    } else {
      setEditId(null);
      setForm({ ...EMPTY_FORM });
      setErrors({});
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    const missingFields = getMissingRequiredFields(form);
    if (missingFields.length > 0) {
      const nextErrors = {};
      missingFields.forEach((field) => {
        nextErrors[field] = `${FIELD_LABELS[field]} is required for ${form.asset_type}`;
      });
      setErrors(nextErrors);
      toast.error(`Please fill required fields: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}`);
      return;
    }

    const basePayload = {
      ...form,
      purchase_cost: form.purchase_cost === "" ? undefined : Number(form.purchase_cost),
      assigned_to: form.assigned_to || undefined,
      vendor: form.vendor || undefined,
      purchase_date: form.purchase_date || undefined,
      warranty_expiry: form.warranty_expiry || undefined,
      assigned_date: form.assigned_date || undefined,
      allocation_date: form.allocation_date || undefined,
      status: normalizeStatus(form.status),
      plan_type: normalizePlanType(form.plan_type),
      asset_name: form.asset_name || undefined,
      processor: form.processor || undefined,
      ram: form.ram || undefined,
      storage: form.storage || undefined,
      operating_system: form.operating_system || undefined,
      device_category: form.device_category || undefined,
      ip_address: form.ip_address || undefined,
      mac_address: form.mac_address || undefined,
      software_category: form.software_category || undefined,
      version: form.version || undefined,
      license_type: form.license_type || undefined,
      license_key_subscription_id: form.license_key_subscription_id || undefined,
      number_of_licenses: form.number_of_licenses === "" ? undefined : Number(form.number_of_licenses),
      expiry_renewal_date: form.expiry_renewal_date || undefined,
      imei_number: form.imei_number || undefined,
      rack_name: form.rack_name || undefined,
      rack_type: form.rack_type || undefined,
      rack_size_u_height: form.rack_size_u_height || undefined,
      installation_date: form.installation_date || undefined,
      cable_name: form.cable_name || undefined,
      cable_type: form.cable_type || undefined,
      length: form.length === "" ? undefined : Number(form.length),
      printer_type: form.printer_type || undefined,
      connection_type: form.connection_type || undefined,
      sim_number_iccid: form.sim_number_iccid || undefined,
      mobile_number: form.mobile_number || undefined,
      service_provider: form.service_provider || undefined,
      department: form.department || undefined,
      monthly_plan_package: form.monthly_plan_package || undefined,
      remarks: form.remarks || undefined,
    };

    const payload = form.asset_type === "SIM Card"
      ? basePayload
      : (({ service_provider, plan_type, allocation_date, sim_number_iccid, mobile_number, monthly_plan_package, ...rest }) => rest)(basePayload);
    setSaving(true);
    try {
      if (editId) {
        await itHelpdeskAPI.assets.update(editId, payload);
        toast.success("Asset updated");
      } else {
        await itHelpdeskAPI.assets.create(payload);
        toast.success("Asset created");
      }
      setShowModal(false);
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this asset?")) return;
    try {
      await itHelpdeskAPI.assets.remove(id);
      toast.success("Deleted");
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const statusColor = (s) => {
    switch (String(s || "").toLowerCase()) {
      case "available":
        return "success";
      case "assigned":
        return "info";
      case "in repair":
      case "repair":
        return "warning";
      case "retired":
      case "spare":
        return "default";
      case "lost":
      case "expired":
      case "damaged":
        return "error";
      case "active":
        return "success";
      case "suspended":
        return "warning";
      default:
        return "default";
    }
  };

  const requiredFieldsForType = getRequiredFieldsForType(form.asset_type);
  const canSave = true;
  const requiredHint = requiredFieldsForType.map((field) => FIELD_LABELS[field]).join(", ");
  const statusOptions = form.asset_type === "SIM Card" ? ["Available", "Assigned", "Active", "Inactive"] : form.asset_type === "Printer" ? ["Available", "Active", "Repair", "Retired"] : form.asset_type === "Network Device" ? ["Active", "Spare", "Repair", "Retired"] : form.asset_type === "Software" ? ["Active", "Expired", "Suspended"] : form.asset_type === "Rack" ? ["Active", "Inactive", "Occupied", "Available", "Blocked", "Under Maintenance"] : form.asset_type === "Desktop" || form.asset_type === "Laptop" || form.asset_type === "Phone" ? ["Available", "Assigned", "Active", "Inactive", "In Repair", "Retired"] : form.asset_type === "Cable" ? ["Available", "Assigned", "In Repair", "Retired"] : STATUSES;
  const isComputerAsset = form.asset_type === "Desktop" || form.asset_type === "Laptop" || form.asset_type === "Computer";
  const manufacturerLabel = isComputerAsset ? "Brand" : "Manufacturer";
  const warrantyLabel = isComputerAsset ? "Warranty End Date" : "Warranty Expiry";

  const isRequiredField = (field) => requiredFieldsForType.includes(field);
  const getFieldError = (field) => errors[field];
  const getFieldHelperText = (field) => getFieldError(field) || (isRequiredField(field) ? `Required for ${form.asset_type}` : undefined);
  const getRequiredProps = (field) => ({
    required: isRequiredField(field),
    error: Boolean(getFieldError(field)),
    helperText: getFieldHelperText(field),
  });

  const updateField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      if (value === undefined || value === null || value === "") return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Inventory2Icon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Asset Management
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchData(pagination.page)}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add Asset
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Asset Type"
                size="small"
                fullWidth
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, status: "" }))}
              >
                <MenuItem value="">All Types</MenuItem>
                {ASSET_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Status"
                size="small"
                fullWidth
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {(filters.type === "SIM Card"
                  ? ["Available", "Assigned", "Active", "Inactive"]
                  : filters.type === "Printer"
                  ? ["Available", "Active", "Repair", "Retired"]
                  : filters.type === "Network Device"
                  ? ["Active", "Spare", "Repair", "Retired"]
                  : filters.type === "Software"
                  ? ["Active", "Expired", "Suspended"]
                  : filters.type === "Rack"
                  ? ["Active", "Inactive", "Occupied", "Available", "Blocked", "Under Maintenance"]
                  : filters.type === "Desktop" || filters.type === "Laptop" || filters.type === "Phone"
                  ? ["Available", "Assigned", "Active", "Inactive", "In Repair", "Retired"]
                  : filters.type === "Cable"
                  ? ["Available", "Assigned", "In Repair", "Retired"]
                  : STATUSES
                ).map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                 <TableHead>
                  <TableRow>
                    <TableCell>Asset Tag</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Manufacturer</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No assets found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((a) => (
                      <TableRow key={a._id} hover>
                        <TableCell>{a.asset_tag}</TableCell>
                        <TableCell>{a.asset_type}</TableCell>
                        <TableCell>{a.manufacturer || "—"}</TableCell>
                        <TableCell>
                          <Chip label={a.status} color={statusColor(a.status)} size="small" />
                        </TableCell>
                        <TableCell>{a.location || "—"}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpen(a)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={(e) => handleDelete(e, a._id)}>
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
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <Typography variant="caption" color="text.secondary">
              Total: {pagination.total}
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                disabled={pagination.page <= 1}
                onClick={() => fetchData(pagination.page - 1)}
              >
                Prev
              </Button>
              <Typography variant="caption" sx={{ alignSelf: "center" }}>
                Page {pagination.page}
              </Typography>
              <Button
                size="small"
                disabled={pagination.page * pagination.limit >= pagination.total}
                onClick={() => fetchData(pagination.page + 1)}
              >
                Next
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit Asset" : "New Asset"}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Required for {form.asset_type}: {requiredHint}
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                label="Asset Tag"
                size="small"
                fullWidth
                {...getRequiredProps("asset_tag")}
                value={form.asset_tag}
                onChange={(e) => updateField("asset_tag", e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Asset Type"
                size="small"
                fullWidth
                {...getRequiredProps("asset_type")}
                value={form.asset_type}
                onChange={(e) => {
                  const assetType = e.target.value;
                  const simStatuses = ["Available", "Assigned", "Active", "Inactive"];
                  const printerStatuses = ["Available", "Active", "Repair", "Retired"];
                  const networkStatuses = ["Active", "Spare", "Repair", "Retired"];
                  const softwareStatuses = ["Active", "Expired", "Suspended"];
                  const desktopStatuses = ["Available", "Assigned", "Active", "Inactive", "In Repair", "Retired"];
                  const phoneStatuses = ["Available", "Assigned", "Active", "Inactive", "In Repair", "Retired"];
                  const cableStatuses = ["Available", "Assigned", "In Repair", "Retired"];
                  let nextStatus = form.status;
                  if (assetType === "SIM Card" && !simStatuses.includes(form.status)) nextStatus = "Available";
                  if (assetType === "Printer" && !printerStatuses.includes(form.status)) nextStatus = "Available";
                  if (assetType === "Network Device" && !networkStatuses.includes(form.status)) nextStatus = "Active";
                  if (assetType === "Software" && !softwareStatuses.includes(form.status)) nextStatus = "Active";
                  if ((assetType === "Desktop" || assetType === "Laptop") && !desktopStatuses.includes(form.status)) nextStatus = "Available";
                  if (assetType === "Phone" && !phoneStatuses.includes(form.status)) nextStatus = "Available";
                  if (assetType === "Cable" && !cableStatuses.includes(form.status)) nextStatus = "Available";
                  setForm((f) => ({ ...f, asset_type: assetType, status: nextStatus }));
                  setErrors((current) => {
                    const next = { ...current };
                    const requiredFields = getRequiredFieldsForType(assetType);
                    Object.keys(next).forEach((field) => {
                      if (!requiredFields.includes(field)) delete next[field];
                    });
                    return next;
                  });
                }}
              >
                {ASSET_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {form.asset_type === "SIM Card" ? (
              <>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="SIM Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("sim_number_iccid")}
                    value={form.sim_number_iccid}
                    onChange={(e) => updateField("sim_number_iccid", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Mobile Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("mobile_number")}
                    value={form.mobile_number}
                    onChange={(e) => updateField("mobile_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="IMSI Number"
                    size="small"
                    fullWidth
                    value={form.imsi_number}
                    onChange={(e) => updateField("imsi_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Service Provider"
                    size="small"
                    fullWidth
                    {...getRequiredProps("service_provider")}
                    value={form.service_provider}
                    onChange={(e) => updateField("service_provider", e.target.value)}
                  >
                    <MenuItem value="">Select Service Provider</MenuItem>
                    {SERVICE_PROVIDERS.map((provider) => (
                      <MenuItem key={provider} value={provider}>
                        {provider}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Plan Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("plan_type")}
                    value={form.plan_type}
                    onChange={(e) => updateField("plan_type", e.target.value)}
                  >
                    <MenuItem value="">Select Plan Type</MenuItem>
                    {PLAN_TYPES.map((planType) => (
                      <MenuItem key={planType} value={planType}>
                        {planType}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Monthly Plan/Package"
                    size="small"
                    fullWidth
                    {...getRequiredProps("monthly_plan_package")}
                    value={form.monthly_plan_package}
                    onChange={(e) => updateField("monthly_plan_package", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Department"
                    size="small"
                    fullWidth
                    {...getRequiredProps("department")}
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("allocation_date")}
                    value={form.allocation_date}
                    onChange={(e) => updateField("allocation_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Vendor"
                    size="small"
                    fullWidth
                    value={form.vendor}
                    onChange={(e) => updateField("vendor", e.target.value)}
                  >
                    <MenuItem value="">No Vendor</MenuItem>
                    {vendors.map((v) => (
                      <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Remarks"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={form.remarks}
                    onChange={(e) => updateField("remarks", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Printer" ? (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Printer Name"
                    size="small"
                    fullWidth
                    {...getRequiredProps("asset_name")}
                    value={form.asset_name}
                    onChange={(e) => updateField("asset_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Brand"
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Model"
                    size="small"
                    fullWidth
                    {...getRequiredProps("model")}
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("serial_number")}
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Printer Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("printer_type")}
                    value={form.printer_type}
                    onChange={(e) => updateField("printer_type", e.target.value)}
                  >
                    <MenuItem value="">Select Printer Type</MenuItem>
                    {PRINTER_TYPES.map((printerType) => (
                      <MenuItem key={printerType} value={printerType}>
                        {printerType}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Connection Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("connection_type")}
                    value={form.connection_type}
                    onChange={(e) => updateField("connection_type", e.target.value)}
                  >
                    <MenuItem value="">Select Connection Type</MenuItem>
                    {CONNECTION_TYPES.map((connectionType) => (
                      <MenuItem key={connectionType} value={connectionType}>
                        {connectionType}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Department"
                    size="small"
                    fullWidth
                    {...getRequiredProps("department")}
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Network Device" ? (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Device Name"
                    size="small"
                    fullWidth
                    {...getRequiredProps("asset_name")}
                    value={form.asset_name}
                    onChange={(e) => updateField("asset_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Device Category"
                    size="small"
                    fullWidth
                    {...getRequiredProps("device_category")}
                    value={form.device_category}
                    onChange={(e) => updateField("device_category", e.target.value)}
                  >
                    <MenuItem value="">Select Device Category</MenuItem>
                    {DEVICE_CATEGORIES.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Brand"
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Model"
                    size="small"
                    fullWidth
                    {...getRequiredProps("model")}
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("serial_number")}
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="IP Address"
                    size="small"
                    fullWidth
                    {...getRequiredProps("ip_address")}
                    value={form.ip_address}
                    onChange={(e) => updateField("ip_address", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="MAC Address"
                    size="small"
                    fullWidth
                    {...getRequiredProps("mac_address")}
                    value={form.mac_address}
                    onChange={(e) => updateField("mac_address", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Software" ? (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Software Name"
                    size="small"
                    fullWidth
                    {...getRequiredProps("asset_name")}
                    value={form.asset_name}
                    onChange={(e) => updateField("asset_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Software Category"
                    size="small"
                    fullWidth
                    {...getRequiredProps("software_category")}
                    value={form.software_category}
                    onChange={(e) => updateField("software_category", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Version"
                    size="small"
                    fullWidth
                    {...getRequiredProps("version")}
                    value={form.version}
                    onChange={(e) => updateField("version", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="License Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("license_type")}
                    value={form.license_type}
                    onChange={(e) => updateField("license_type", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="License Key / Subscription ID"
                    size="small"
                    fullWidth
                    {...getRequiredProps("license_key_subscription_id")}
                    value={form.license_key_subscription_id}
                    onChange={(e) => updateField("license_key_subscription_id", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Vendor/Publisher"
                    size="small"
                    fullWidth
                    {...getRequiredProps("vendor")}
                    value={form.vendor}
                    onChange={(e) => updateField("vendor", e.target.value)}
                  >
                    <MenuItem value="">No Vendor/Publisher</MenuItem>
                    {vendors.map((v) => (
                      <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Number of Licenses"
                    type="number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("number_of_licenses")}
                    value={form.number_of_licenses}
                    onChange={(e) => updateField("number_of_licenses", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Department"
                    size="small"
                    fullWidth
                    {...getRequiredProps("department")}
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Expiry/Renewal Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("expiry_renewal_date")}
                    value={form.expiry_renewal_date}
                    onChange={(e) => updateField("expiry_renewal_date", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Phone" ? (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Brand"
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Model"
                    size="small"
                    fullWidth
                    {...getRequiredProps("model")}
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="IMEI Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("imei_number")}
                    value={form.imei_number}
                    onChange={(e) => updateField("imei_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("serial_number")}
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Mobile Number (if SIM assigned)"
                    size="small"
                    fullWidth
                    {...getRequiredProps("mobile_number")}
                    value={form.mobile_number}
                    onChange={(e) => updateField("mobile_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Department"
                    size="small"
                    fullWidth
                    {...getRequiredProps("department")}
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Rack" ? (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Rack Name/Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("rack_name")}
                    value={form.rack_name}
                    onChange={(e) => updateField("rack_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Rack Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("rack_type")}
                    value={form.rack_type}
                    onChange={(e) => updateField("rack_type", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Rack Size (U Height)"
                    size="small"
                    fullWidth
                    {...getRequiredProps("rack_size_u_height")}
                    value={form.rack_size_u_height}
                    onChange={(e) => updateField("rack_size_u_height", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Manufacturer/Brand"
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Installation Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("installation_date")}
                    value={form.installation_date}
                    onChange={(e) => updateField("installation_date", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Cable" ? (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Cable Name"
                    size="small"
                    fullWidth
                    {...getRequiredProps("cable_name")}
                    value={form.cable_name}
                    onChange={(e) => updateField("cable_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Cable Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("cable_type")}
                    value={form.cable_type}
                    onChange={(e) => updateField("cable_type", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Length"
                    type="number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("length")}
                    value={form.length}
                    onChange={(e) => updateField("length", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
              </>
            ) : isComputerAsset ? (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Asset Name"
                    size="small"
                    fullWidth
                    {...getRequiredProps("asset_name")}
                    value={form.asset_name}
                    onChange={(e) => updateField("asset_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label={manufacturerLabel}
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Model"
                    size="small"
                    fullWidth
                    {...getRequiredProps("model")}
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("serial_number")}
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Processor"
                    size="small"
                    fullWidth
                    {...getRequiredProps("processor")}
                    value={form.processor}
                    onChange={(e) => updateField("processor", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="RAM"
                    size="small"
                    fullWidth
                    {...getRequiredProps("ram")}
                    value={form.ram}
                    onChange={(e) => updateField("ram", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Storage"
                    size="small"
                    fullWidth
                    {...getRequiredProps("storage")}
                    value={form.storage}
                    onChange={(e) => updateField("storage", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Operating System"
                    size="small"
                    fullWidth
                    {...getRequiredProps("operating_system")}
                    value={form.operating_system}
                    onChange={(e) => updateField("operating_system", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Department"
                    size="small"
                    fullWidth
                    {...getRequiredProps("department")}
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label={warrantyLabel}
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("warranty_expiry")}
                    value={form.warranty_expiry}
                    onChange={(e) => updateField("warranty_expiry", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Vendor"
                    size="small"
                    fullWidth
                    value={form.vendor}
                    onChange={(e) => updateField("vendor", e.target.value)}
                  >
                    <MenuItem value="">No Vendor</MenuItem>
                    {vendors.map((v) => (
                      <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Remarks"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={form.remarks}
                    onChange={(e) => updateField("remarks", e.target.value)}
                  />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("serial_number")}
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Manufacturer"
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Model"
                    size="small"
                    fullWidth
                    {...getRequiredProps("model")}
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Warranty Expiry"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("warranty_expiry")}
                    value={form.warranty_expiry}
                    onChange={(e) => updateField("warranty_expiry", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("assigned_date")}
                    value={form.assigned_date}
                    onChange={(e) => updateField("assigned_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Cost"
                    type="number"
                    size="small"
                    fullWidth
                    value={form.purchase_cost}
                    onChange={(e) => updateField("purchase_cost", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Vendor"
                    size="small"
                    fullWidth
                    {...getRequiredProps("vendor")}
                    value={form.vendor}
                    onChange={(e) => updateField("vendor", e.target.value)}
                  >
                    <MenuItem value="">No Vendor</MenuItem>
                    {vendors.map((v) => (
                      <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !canSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
