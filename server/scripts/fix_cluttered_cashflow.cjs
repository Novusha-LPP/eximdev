const fs = require('fs');
const parser = require('@babel/parser');

function buildBalancedRenderBlock(isExportDefault = false) {
  const defaultTrade = isExportDefault ? "export" : "import";
  return `  return (
    <Box sx={{ width: "100%", p: 2, backgroundColor: "#f8fafc", minHeight: "85vh" }}>
      {/* Top Header Bar - Balanced & Clean */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 1.5,
          backgroundColor: "#fff",
          py: 1,
          px: 2,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          border: "1px solid #e2e8f0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <AccountBalanceWalletIcon sx={{ color: "#1976d2", fontSize: 24 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "16px", lineHeight: 1.2 }}>
              Cashflow Register
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "11.5px" }}>
              Track cash expenses, withdrawals & real-time balance
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
            onClick={() => setBalanceModalOpen(true)}
            sx={{ fontWeight: 600, fontSize: "12px", py: 0.5, px: 1.5, textTransform: "none", boxShadow: "none" }}
          >
            Add Balance
          </Button>

          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
            onClick={() => setExpenseModalOpen(true)}
            sx={{
              fontWeight: 600,
              fontSize: "12px",
              py: 0.5,
              px: 1.5,
              textTransform: "none",
              boxShadow: "none",
              backgroundColor: "#d97706",
              "&:hover": { backgroundColor: "#b45309" },
            }}
          >
            Add Cash Expense
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<GroupIcon sx={{ fontSize: 16 }} />}
            onClick={() => setTeamModalOpen(true)}
            sx={{ fontWeight: 600, fontSize: "12px", py: 0.5, px: 1.5, textTransform: "none" }}
          >
            Team ({teamMembers.length})
          </Button>

          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
            onClick={handleExportExcel}
            sx={{ fontWeight: 600, fontSize: "12px", py: 0.5, px: 1.5, textTransform: "none" }}
          >
            Export Excel
          </Button>

          <IconButton size="small" onClick={fetchData} title="Refresh" color="primary" sx={{ p: 0.6 }}>
            <RefreshIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </Box>

      {/* KPI Cards - Balanced Height & Clear Spacing */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        {/* Total Added Balance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: "4px solid #0284c7",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              borderLeftColor: "#0284c7",
            }}
          >
            <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.4 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "11px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  Total Added Balance
                </Typography>
                <TrendingUpIcon sx={{ color: "#0284c7", fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#0284c7", fontSize: "18px", lineHeight: 1.2 }}>
                ₹{formatINR(summary.totalAddedBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Expense */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: "4px solid #dc2626",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              borderLeftColor: "#dc2626",
            }}
          >
            <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.4 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "11px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  Total Expense
                </Typography>
                <TrendingDownIcon sx={{ color: "#dc2626", fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#dc2626", fontSize: "18px", lineHeight: 1.2 }}>
                ₹{formatINR(summary.totalExpense)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Period Cashflow */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: \`4px solid \${summary.netBalance >= 0 ? "#16a34a" : "#ea580c"}\`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              borderLeftColor: summary.netBalance >= 0 ? "#16a34a" : "#ea580c",
            }}
          >
            <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.4 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "11px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  Period Net Cashflow
                </Typography>
                {summary.netBalance >= 0 ? (
                  <TrendingUpIcon sx={{ color: "#16a34a", fontSize: 18 }} />
                ) : (
                  <TrendingDownIcon sx={{ color: "#ea580c", fontSize: 18 }} />
                )}
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: summary.netBalance >= 0 ? "#16a34a" : "#ea580c",
                  fontSize: "18px",
                  lineHeight: 1.2,
                }}
              >
                ₹{formatINR(summary.netBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Overall Running Cash Balance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: "4px solid #0f172a",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderLeftColor: "#0f172a",
            }}
          >
            <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.4 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#0f172a", fontSize: "11px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  Current Cash Balance
                </Typography>
                <AccountBalanceWalletIcon sx={{ color: "#0f172a", fontSize: 18 }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: summary.currentCashBalance >= 0 ? "#16a34a" : "#dc2626",
                  fontSize: "18px",
                  lineHeight: 1.2,
                }}
              >
                ₹{formatINR(summary.currentCashBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar - Clean, Uncluttered, Standard Heights */}
      <Paper
        sx={{
          p: 1.5,
          mb: 1.5,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          gap: 1.2,
        }}
      >
        {/* Row 1: Trade Controls & Quick Presets */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {/* Trade Selector: Import, Export, Both */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant={tradeScope === "both" ? "contained" : "outlined"}
                onClick={() => setTradeScope(tradeScope === "both" ? (mode || "${defaultTrade}") : "both")}
                startIcon={<CompareArrowsIcon sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "12px",
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  height: 32,
                  ...(tradeScope === "both"
                    ? {
                        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                        color: "#fff",
                        boxShadow: "0 2px 5px rgba(79, 70, 229, 0.25)",
                      }
                    : {
                        borderColor: "#cbd5e1",
                        color: "#475569",
                        "&:hover": { borderColor: "#4f46e5", color: "#4f46e5" },
                      }),
                }}
              >
                {tradeScope === "both" ? "Combined View" : "Combine (Both)"}
              </Button>

              <FormControl size="small" sx={{ minWidth: 155 }}>
                <Select
                  value={tradeScope}
                  onChange={(e) => setTradeScope(e.target.value)}
                  sx={{
                    height: 32,
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    backgroundColor: "#fff",
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      gap: 0.8,
                      py: 0.4,
                      px: 1.2,
                    },
                  }}
                >
                  <MenuItem value="import" sx={{ fontSize: "12px", fontWeight: 600 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#0284c7", mr: 1, display: "inline-block" }} />
                    Import Only
                  </MenuItem>
                  <MenuItem value="export" sx={{ fontSize: "12px", fontWeight: 600 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ea580c", mr: 1, display: "inline-block" }} />
                    Export Only
                  </MenuItem>
                  <MenuItem value="both" sx={{ fontSize: "12px", fontWeight: 700, color: "#4f46e5" }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#7c3aed", mr: 1, display: "inline-block" }} />
                    Both (Combined)
                  </MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Divider orientation="vertical" flexItem sx={{ height: 20, my: "auto" }} />

            <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>
              Quick Presets:
            </Typography>
            <Chip
              label="Today"
              size="small"
              clickable
              color={startDate === todayStr && endDate === todayStr ? "primary" : "default"}
              onClick={() => applyDatePreset("today")}
              sx={{ height: 26, fontSize: "11.5px", fontWeight: 500 }}
            />
            <Chip
              label="This Month"
              size="small"
              clickable
              onClick={() => applyDatePreset("thisMonth")}
              sx={{ height: 26, fontSize: "11.5px", fontWeight: 500 }}
            />
            <Chip
              label="This FY"
              size="small"
              clickable
              onClick={() => applyDatePreset("thisFY")}
              sx={{ height: 26, fontSize: "11.5px", fontWeight: 500 }}
            />
            <Chip
              label="All Time"
              size="small"
              clickable
              color={!startDate && !endDate ? "primary" : "default"}
              onClick={() => applyDatePreset("all")}
              sx={{ height: 26, fontSize: "11.5px", fontWeight: 500 }}
            />
          </Stack>

          {(startDate || endDate || expenseMadeBy !== "ALL" || partyName || searchTerm) && (
            <Button
              size="small"
              startIcon={<ClearIcon sx={{ fontSize: 15 }} />}
              onClick={() => {
                applyDatePreset("today");
                setExpenseMadeBy("ALL");
                setPartyName("");
                setSearchTerm("");
              }}
              sx={{ textTransform: "none", color: "#64748b", fontSize: "11.5px", py: 0.3, px: 1 }}
            >
              Reset Filters
            </Button>
          )}
        </Box>

        {/* Row 2: Standard Clean Filter Fields */}
        <Grid container spacing={1.5} alignItems="center">
          {/* From Date */}
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="From Date"
              type="date"
              size="small"
              fullWidth
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiInputBase-root": { fontSize: "12px" },
              }}
            />
          </Grid>

          {/* To Date */}
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="To Date"
              type="date"
              size="small"
              fullWidth
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiInputBase-root": { fontSize: "12px" },
              }}
            />
          </Grid>

          {/* Expense Made By Filter */}
          <Grid item xs={12} sm={6} md={2.4}>
            <FormControl fullWidth size="small">
              <Select
                value={expenseMadeBy}
                onChange={(e) => setExpenseMadeBy(e.target.value)}
                displayEmpty
                sx={{
                  fontSize: "12px",
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: "12px" }}>All Team Members</MenuItem>
                {teamMembers.map((m) => (
                  <MenuItem key={m} value={m} sx={{ fontSize: "12px" }}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Importer / Exporter */}
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="Importer / Exporter"
              placeholder="Search party..."
              size="small"
              fullWidth
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              sx={{
                "& .MuiInputBase-root": { fontSize: "12px" },
              }}
            />
          </Grid>

          {/* Search particular / job */}
          <Grid item xs={12} sm={12} md={2.4}>
            <TextField
              label="Search"
              placeholder="Ref / Particular..."
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiInputBase-root": { fontSize: "12px" },
              }}
            />
          </Grid>
        </Grid>
      </Paper>`;
}

function updateFile(filePath, isExportDefault) {
  let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const startIdx = content.indexOf('  return (\n    <Box sx={{ width: "100%", p:');
  const endIdx = content.indexOf('      {/* Main Ledger Table */}');

  if (startIdx !== -1 && endIdx !== -1) {
    const newRender = buildBalancedRenderBlock(isExportDefault);
    content = content.slice(0, startIdx) + newRender + '\n\n' + content.slice(endIdx);
    
    // Set table container maxHeight & table paddings
    content = content.replace(
      'maxHeight: "calc(100vh - 230px)"',
      'maxHeight: "calc(100vh - 275px)"'
    );
    
    // Header cells padding
    content = content.replace(
      /py: 0\.5, px: 0\.8/g,
      'py: 0.8, px: 1.2'
    );
    // Body cells padding
    content = content.replace(
      /py: 0\.4, px: 0\.8/g,
      'py: 0.7, px: 1.2'
    );
    // Chip height
    content = content.replace(
      /height: 20,\s*fontSize: "9\.5px"/g,
      'height: 22, fontSize: "10px"'
    );

    parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath} successfully!`);
  } else {
    console.error(`Could not locate render block in ${filePath}`);
  }
}

updateFile('C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/CashflowTracker.jsx', false);
updateFile('C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/CashflowTracker.jsx', true);
