import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Button,
  IconButton,
  Checkbox,
  Chip,
  Autocomplete,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

function Stage2SupplierQuotation({ data, onChange, globalData, onGlobalChange }) {
  const [savedSuppliers, setSavedSuppliers] = useState([]);

  useEffect(() => {
    // Fetch saved suppliers list from backend API
    axios
      .get(`${process.env.REACT_APP_API_STRING}/tyre-suppliers`)
      .then((res) => {
        if (res.data?.suppliers) {
          setSavedSuppliers(res.data.suppliers);
        }
      })
      .catch((err) => {
        console.error("Error fetching saved tyre suppliers:", err);
      });
  }, []);

  const updateField = (field, value) => {
    onChange({ [field]: typeof value === "string" ? value.toUpperCase() : value });
  };

  const suppliers =
    data.suppliers && data.suppliers.length > 0
      ? data.suppliers
      : [{ supplierName: "Supplier 1" }, { supplierName: "Supplier 2" }, { supplierName: "Supplier 3" }];

  const routingChecklist = data.routingChecklist || [];

  // Multiple selected/awarded suppliers
  const selectedSuppliers =
    data.selectedSuppliers && data.selectedSuppliers.length > 0
      ? data.selectedSuppliers
      : [
          {
            selectedSupplier: data.selectedSupplierL1 || "",
            priceQuoted: data.l1PriceQuoted || 0,
            totalOrderValue: data.totalOrderValue || 0,
            reasonForSelection: data.reasonForSelection || "",
          },
        ];

  const updateSupplierField = useCallback(
    (index, field, value) => {
      const current = [...suppliers];
      const val = typeof value === "string" ? value.toUpperCase() : value;
      current[index] = { ...current[index], [field]: val };
      onChange({ suppliers: current });
    },
    [suppliers, onChange]
  );

  // Handle Autocomplete selection or typing for Supplier Name
  const handleSupplierNameSelect = (index, selectedVal) => {
    const rawName = typeof selectedVal === "string" ? selectedVal : (selectedVal?.supplierName || "");
    const nameUpper = rawName.toUpperCase();

    const matched = savedSuppliers.find(
      (s) => s.supplierName?.toUpperCase() === nameUpper
    );

    const current = [...suppliers];
    const existing = current[index] || {};

    if (matched) {
      current[index] = {
        ...existing,
        supplierName: nameUpper,
        contactPerson: matched.contactPerson?.toUpperCase() || existing.contactPerson || "",
        phoneNumber: matched.phoneNumber?.toUpperCase() || existing.phoneNumber || "",
        emailWhatsApp: matched.emailWhatsApp?.toUpperCase() || existing.emailWhatsApp || "",
        gstNumber: matched.gstNumber?.toUpperCase() || existing.gstNumber || "",
        bankAccountNo: matched.bankAccountNo?.toUpperCase() || existing.bankAccountNo || "",
        bankName: matched.bankName?.toUpperCase() || existing.bankName || "",
        bankIfscCode: matched.bankIfscCode?.toUpperCase() || existing.bankIfscCode || "",
        bankBranchCode: matched.bankBranchCode?.toUpperCase() || existing.bankBranchCode || "",
        supplierNameInBank: matched.supplierNameInBank?.toUpperCase() || existing.supplierNameInBank || "",
        paymentTerms: matched.paymentTerms?.toUpperCase() || existing.paymentTerms || "",
        deliveryLocation: matched.deliveryLocation?.toUpperCase() || existing.deliveryLocation || "",
      };
    } else {
      current[index] = {
        ...existing,
        supplierName: nameUpper,
      };
    }
    onChange({ suppliers: current });
  };

  const addSupplier = () => {
    const nextIdx = suppliers.length + 1;
    const newSupplier = { supplierName: `SUPPLIER ${nextIdx}` };
    onChange({ suppliers: [...suppliers, newSupplier] });
  };

  const removeSupplier = (idx) => {
    if (suppliers.length <= 1) {
      alert("At least one supplier is required");
      return;
    }
    const updated = suppliers.filter((_, i) => i !== idx);
    onChange({ suppliers: updated });
  };

  // Get available Tyre Types from Stage 1 items
  const stage1Items = globalData?.stage1?.itemsRequired || [];
  const availableTyreTypes = Array.from(
    new Set(stage1Items.map((item) => item.tyreType).filter(Boolean))
  );
  if (availableTyreTypes.length === 0) {
    availableTyreTypes.push("New Tyre", "Remould Tyre");
  }

  // Handle Tyre Type selection for a supplier -> Auto-fetch item details from Stage 1
  const handleTyreTypeSelect = (idx, selectedType) => {
    const matchedItem = stage1Items.find((item) => item.tyreType === selectedType) || stage1Items[0];
    const current = [...suppliers];
    const existing = current[idx] || {};

    current[idx] = {
      ...existing,
      selectedTyreType: selectedType,
      tyreBrand: (matchedItem?.brandPreference || existing.tyreBrand || "").toUpperCase(),
      sizeSpecification: (matchedItem?.sizeSpec || existing.sizeSpecification || "").toUpperCase(),
      qtyAvailable: matchedItem?.qty || existing.qtyAvailable || 0,
      unitPriceNew:
        selectedType === "New Tyre"
          ? matchedItem?.estUnitCost || existing.unitPriceNew || 0
          : existing.unitPriceNew || 0,
      unitPriceRemould:
        selectedType === "Remould Tyre"
          ? matchedItem?.estUnitCost || existing.unitPriceRemould || 0
          : existing.unitPriceRemould || 0,
    };
    onChange({ suppliers: current });
  };

  // Update a selected supplier entry in Section C
  const updateSelectedSupplier = (idx, field, value) => {
    const current = [...selectedSuppliers];
    const val = typeof value === "string" ? value.toUpperCase() : value;
    current[idx] = { ...current[idx], [field]: val };

    if (field === "selectedSupplier") {
      const selectedName = val;
      const foundIdx = suppliers.findIndex(
        (s, i) => s.supplierName?.toUpperCase() === selectedName || `SUPPLIER ${i + 1}` === selectedName
      );
      if (foundIdx !== -1) {
        const s = suppliers[foundIdx];
        const newPrice = Number(s?.unitPriceNew) || 0;
        const remouldPrice = Number(s?.unitPriceRemould) || 0;
        const price = newPrice > 0 ? newPrice : remouldPrice;
        const qty = Number(s?.qtyAvailable) || 0;
        const freight = Number(s?.freightCharges) || 0;
        const discount = Number(s?.discountOffered) || 0;
        const total = price * qty + freight - discount;
        current[idx].priceQuoted = price;
        current[idx].totalOrderValue = total;
      }
    }

    const overallTotal = current.reduce((acc, item) => acc + (Number(item.totalOrderValue) || 0), 0);
    onChange({
      selectedSuppliers: current,
      selectedSupplierL1: current[0]?.selectedSupplier || "",
      l1PriceQuoted: current[0]?.priceQuoted || 0,
      totalOrderValue: overallTotal,
      reasonForSelection: current[0]?.reasonForSelection || "",
    });
  };

  const addSelectedSupplier = () => {
    const updated = [
      ...selectedSuppliers,
      { selectedSupplier: "", priceQuoted: 0, totalOrderValue: 0, reasonForSelection: "" },
    ];
    onChange({ selectedSuppliers: updated });
  };

  const removeSelectedSupplier = (idx) => {
    if (selectedSuppliers.length <= 1) return;
    const updated = selectedSuppliers.filter((_, i) => i !== idx);
    const overallTotal = updated.reduce((acc, item) => acc + (Number(item.totalOrderValue) || 0), 0);
    onChange({
      selectedSuppliers: updated,
      selectedSupplierL1: updated[0]?.selectedSupplier || "",
      l1PriceQuoted: updated[0]?.priceQuoted || 0,
      totalOrderValue: overallTotal,
      reasonForSelection: updated[0]?.reasonForSelection || "",
    });
  };

  const handleChecklistToggle = (idx, checked) => {
    const today = new Date().toISOString().split("T")[0];
    const defaultSteps = [
      { step: "Step 1", action: "Sent to Finance Manager for approval", responsible: "Purchase Officer" },
    ];
    const current = [...routingChecklist];
    while (current.length <= idx) {
      current.push(defaultSteps[current.length] || { step: `Step ${current.length + 1}`, action: "", responsible: "" });
    }

    if (checked) {
      current[idx] = { ...current[idx], date: today, status: "Done" };
      if (onGlobalChange) onGlobalChange("status", "Quotation Received");
    } else {
      current[idx] = { ...current[idx], date: "", status: "Pending" };
      if (onGlobalChange) onGlobalChange("status", "Preparing for Quotation");
    }
    onChange({ routingChecklist: current });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        A. Reference Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <TextField
            label="PR Number"
            value={globalData?.prNumber || ""}
            onChange={() => {}}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="PO Number"
            value={globalData?.poNumber || ""}
            onChange={(e) => onGlobalChange("poNumber", e.target.value.toUpperCase())}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Purchase Officer Name"
            value={data.purchaseOfficerName || ""}
            onChange={(e) => updateField("purchaseOfficerName", e.target.value.toUpperCase())}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="PO Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.poDate ? data.poDate.split("T")[0] : ""}
            onChange={(e) => updateField("poDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          B. Supplier Details & Quotation
        </Typography>
        <Button variant="outlined" size="small" startIcon={<Add />} onClick={addSupplier}>
          Add Supplier
        </Button>
      </Box>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold", width: 220 }}>Field</TableCell>
              {suppliers.map((sup, idx) => (
                <TableCell key={idx} sx={{ fontWeight: "bold" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>{sup.supplierName || `Supplier ${idx + 1}`}</span>
                    {suppliers.length > 3 && (
                      <IconButton size="small" color="error" onClick={() => removeSupplier(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Tyre Type Selection Row */}
            <TableRow sx={{ backgroundColor: "#f0f7ff" }}>
              <TableCell sx={{ fontWeight: "bold", color: "#1976d2" }}>Select Tyre Type</TableCell>
              {suppliers.map((sup, idx) => (
                <TableCell key={idx}>
                  <TextField
                    select
                    value={sup?.selectedTyreType || ""}
                    onChange={(e) => handleTyreTypeSelect(idx, e.target.value)}
                    fullWidth
                    size="small"
                    variant="outlined"
                    SelectProps={{ displayEmpty: true }}
                  >
                    <MenuItem value="">
                      <em>Select Tyre Type</em>
                    </MenuItem>
                    {availableTyreTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
              ))}
            </TableRow>

            {/* Supplier Name Autocomplete Row */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Supplier Name</TableCell>
              {suppliers.map((sup, idx) => (
                <TableCell key={idx}>
                  <Autocomplete
                    freeSolo
                    options={savedSuppliers}
                    getOptionLabel={(option) => typeof option === "string" ? option : (option.supplierName || "")}
                    value={sup.supplierName || ""}
                    onInputChange={(e, newInputValue) => {
                      if (e && e.type === "change") {
                        handleSupplierNameSelect(idx, newInputValue);
                      }
                    }}
                    onChange={(e, newValue) => {
                      handleSupplierNameSelect(idx, newValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Type or Search Supplier"
                        size="small"
                        variant="standard"
                        fullWidth
                      />
                    )}
                  />
                </TableCell>
              ))}
            </TableRow>

            {[
              ["Contact Person", "contactPerson", "text"],
              ["Phone Number", "phoneNumber", "text"],
              ["Email / WhatsApp", "emailWhatsApp", "text"],
              ["GST Number", "gstNumber", "text"],
              ["Bank Account No", "bankAccountNo", "text"],
              ["Bank Name", "bankName", "text"],
              ["Bank IFSC Code", "bankIfscCode", "text"],
              ["Bank Branch Code", "bankBranchCode", "text"],
              ["Supplier Name in Bank", "supplierNameInBank", "text"],
              ["Tyre Brand", "tyreBrand", "text"],
              ["Size & Specification", "sizeSpecification", "text"],
              ["Unit Price – New Tyre (₹)", "unitPriceNew", "number"],
              ["Unit Price – Remould Tyre (₹)", "unitPriceRemould", "number"],
              ["Qty Available", "qtyAvailable", "number"],
              ["Freight Charges", "freightCharges", "number"],
              ["Delivery Timeline", "deliveryTimeline", "text"],
              ["Delivery Location", "deliveryLocation", "text"],
              ["Warranty / Guarantee", "warrantyGuarantee", "text"],
              ["Payment Terms : Adv / Days", "paymentTerms", "text"],
              ["Discount Offered", "discountOffered", "number"],
              ["Remarks", "remarks", "text"],
            ].map(([label, field, type]) => (
              <TableRow key={field}>
                <TableCell sx={{ fontWeight: "500" }}>{label}</TableCell>
                {suppliers.map((sup, idx) => (
                  <TableCell key={idx}>
                    <TextField
                      type={type}
                      value={sup?.[field] ?? ""}
                      onChange={(e) => updateSupplierField(idx, field, type === "text" ? e.target.value.toUpperCase() : e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          C. Selected / Awarded Supplier(s) Selection (Lowest Qualified Bidder / Split Orders)
        </Typography>
        <Button variant="outlined" size="small" startIcon={<Add />} onClick={addSelectedSupplier}>
          Add Selected Supplier
        </Button>
      </Box>

      {selectedSuppliers.map((item, idx) => (
        <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "#fafafa" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "#1976d2" }}>
              Selected Supplier #{idx + 1}
            </Typography>
            {selectedSuppliers.length > 1 && (
              <IconButton size="small" color="error" onClick={() => removeSelectedSupplier(idx)}>
                <Delete fontSize="small" />
              </IconButton>
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Selected Supplier"
                value={item.selectedSupplier || ""}
                onChange={(e) => updateSelectedSupplier(idx, "selectedSupplier", e.target.value)}
                fullWidth
                size="small"
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  <em>Select Supplier</em>
                </MenuItem>
                {suppliers.map((s, i) => {
                  const sName = s.supplierName || `Supplier ${i + 1}`;
                  return (
                    <MenuItem key={i} value={sName}>
                      {sName}
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Price Quoted (₹)"
                type="number"
                value={item.priceQuoted ?? 0}
                onChange={(e) => updateSelectedSupplier(idx, "priceQuoted", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Total Order Value (₹)"
                type="number"
                value={item.totalOrderValue ?? 0}
                onChange={(e) => updateSelectedSupplier(idx, "totalOrderValue", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Reason for Selection"
                value={item.reasonForSelection || ""}
                onChange={(e) => updateSelectedSupplier(idx, "reasonForSelection", e.target.value.toUpperCase())}
                placeholder="e.g. LOWER PRICE"
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>
      ))}

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        D. Routing & Checklist
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold", width: 80 }}>Check</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Step</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Action</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Responsible</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[{ step: "Step 1", action: "Sent to Finance Manager for approval", responsible: "Purchase Officer" }].map(
              (step, idx) => {
                const item = routingChecklist[idx] || {};
                const isChecked = item.status === "Done";

                return (
                  <TableRow key={idx}>
                    <TableCell>
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => handleChecklistToggle(idx, e.target.checked)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{step.step}</TableCell>
                    <TableCell>{step.action}</TableCell>
                    <TableCell>{step.responsible}</TableCell>
                    <TableCell>{item.date || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={isChecked ? "Done" : "Pending"}
                        color={isChecked ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              }
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default React.memo(Stage2SupplierQuotation);
