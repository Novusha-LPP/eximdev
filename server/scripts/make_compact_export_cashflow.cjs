const fs = require('fs');
const parser = require('@babel/parser');

const filePath = 'C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/CashflowTracker.jsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const newRenderBlock = `  return (
    <Box sx={{ width: "100%", p: 1, backgroundColor: "#f8fafc", minHeight: "85vh" }}>
      {/* Compact Top Header Bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          mb: 1,
          backgroundColor: "#fff",
          py: 0.6,
          px: 1.5,
          borderRadius: 1.5,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccountBalanceWalletIcon sx={{ color: "#1976d2", fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "14px" }}>
            Cashflow Register
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748b", display: { xs: "none", md: "inline" }, fontSize: "11px" }}>
            · Track cash expenses, withdrawals & real-time balance
          </Typography>
        </Box>

        {/* Compact Action Buttons */}
        <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon sx={{ fontSize: 15 }} />}
            onClick={() => setBalanceModalOpen(true)}
            sx={{ fontWeight: 600, fontSize: "11.5px", py: 0.3, px: 1, textTransform: "none", boxShadow: "none" }}
          >
            Add Balance
          </Button>

          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<AddCircleOutlineIcon sx={{ fontSize: 15 }} />}
            onClick={() => setExpenseModalOpen(true)}
            sx={{
              fontWeight: 600,
              fontSize: "11.5px",
              py: 0.3,
              px: 1,
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
            startIcon={<GroupIcon sx={{ fontSize: 15 }} />}
            onClick={() => setTeamModalOpen(true)}
            sx={{ fontWeight: 600, fontSize: "11.5px", py: 0.3, px: 1, textTransform: "none" }}
          >
            Team ({teamMembers.length})
          </Button>

          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={<FileDownloadIcon sx={{ fontSize: 15 }} />}
            onClick={handleExportExcel}
            sx={{ fontWeight: 600, fontSize: "11.5px", py: 0.3, px: 1, textTransform: "none" }}
          >
            Export Excel
          </Button>

          <IconButton size="small" onClick={fetchData} title="Refresh" color="primary" sx={{ p: 0.5 }}>
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Box>

      {/* Ultra-Compact KPI Cards Bar */}
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {/* Total Added Balance */}
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              borderRadius: 1.5,
              borderLeft: "3.5px solid #0284c7",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
              borderLeftColor: "#0284c7",
            }}
          >
            <CardContent sx={{ py: 0.5, px: 1.2, "&:last-child": { pb: 0.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "10px", textTransform: "uppercase" }}>
                  Total Added Balance
                </Typography>
                <TrendingUpIcon sx={{ color: "#0284c7", fontSize: 16 }} />
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 800, color: "#0284c7", fontSize: "16px", lineHeight: 1.2, mt: 0.2 }}>
                ₹{formatINR(summary.totalAddedBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Expense */}
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              borderRadius: 1.5,
              borderLeft: "3.5px solid #dc2626",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
              borderLeftColor: "#dc2626",
            }}
          >
            <CardContent sx={{ py: 0.5, px: 1.2, "&:last-child": { pb: 0.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "10px", textTransform: "uppercase" }}>
                  Total Expense
                </Typography>
                <TrendingDownIcon sx={{ color: "#dc2626", fontSize: 16 }} />
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 800, color: "#dc2626", fontSize: "16px", lineHeight: 1.2, mt: 0.2 }}>
                ₹{formatINR(summary.totalExpense)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Period Cashflow */}
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              borderRadius: 1.5,
              borderLeft: \`3.5px solid \${summary.netBalance >= 0 ? "#16a34a" : "#ea580c"}\`,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
              borderLeftColor: summary.netBalance >= 0 ? "#16a34a" : "#ea580c",
            }}
          >
            <CardContent sx={{ py: 0.5, px: 1.2, "&:last-child": { pb: 0.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "10px", textTransform: "uppercase" }}>
                  Period Net Cashflow
                </Typography>
                {summary.netBalance >= 0 ? (
                  <TrendingUpIcon sx={{ color: "#16a34a", fontSize: 16 }} />
                ) : (
                  <TrendingDownIcon sx={{ color: "#ea580c", fontSize: 16 }} />
                )}
              </Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 800,
                  color: summary.netBalance >= 0 ? "#16a34a" : "#ea580c",
                  fontSize: "16px",
                  lineHeight: 1.2,
                  mt: 0.2,
                }}
              >
                ₹{formatINR(summary.netBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Overall Running Cash Balance */}
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              borderRadius: 1.5,
              borderLeft: "3.5px solid #0f172a",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderLeftColor: "#0f172a",
            }}
          >
            <CardContent sx={{ py: 0.5, px: 1.2, "&:last-child": { pb: 0.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#0f172a", fontSize: "10px", textTransform: "uppercase" }}>
                  Current Cash Balance
                </Typography>
                <AccountBalanceWalletIcon sx={{ color: "#0f172a", fontSize: 16 }} />
              </Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 800,
                  color: summary.currentCashBalance >= 0 ? "#16a34a" : "#dc2626",
                  fontSize: "16px",
                  lineHeight: 1.2,
                  mt: 0.2,
                }}
              >
                ₹{formatINR(summary.currentCashBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ultra-Compact Filter Toolbar */}
      <Paper
        sx={{
          p: 1,
          mb: 1,
          borderRadius: 1.5,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          gap: 0.8,
        }}
      >
        {/* Row 1: Trade Scope Controls + Quick Presets + Reset */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {/* Trade Selector: Import, Export, Both */}
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Button
                size="small"
                variant={tradeScope === "both" ? "contained" : "outlined"}
                onClick={() => setTradeScope(tradeScope === "both" ? (mode || "export") : "both")}
                startIcon={<CompareArrowsIcon sx={{ fontSize: 14 }} />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "11px",
                  borderRadius: "5px",
                  px: 1,
                  py: 0.2,
                  height: 28,
                  ...(tradeScope === "both"
                    ? {
                        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                        color: "#fff",
                        boxShadow: "0 1px 4px rgba(79, 70, 229, 0.3)",
                      }
                    : {
                        borderColor: "#cbd5e1",
                        color: "#475569",
                        "&:hover": { borderColor: "#4f46e5", color: "#4f46e5" },
                      }),
                }}
              >
                {tradeScope === "both" ? "Combined" : "Combine (Both)"}
              </Button>

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={tradeScope}
                  onChange={(e) => setTradeScope(e.target.value)}
                  sx={{
                    height: 28,
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "5px",
                    backgroundColor: "#fff",
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      gap: 0.6,
                      py: 0.3,
                      px: 1,
                    },
                  }}
                >
                  <MenuItem value="import" sx={{ fontSize: "11.5px", fontWeight: 600 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#0284c7", mr: 0.8, display: "inline-block" }} />
                    Import Only
                  </MenuItem>
                  <MenuItem value="export" sx={{ fontSize: "11.5px", fontWeight: 600 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#ea580c", mr: 0.8, display: "inline-block" }} />
                    Export Only
                  </MenuItem>
                  <MenuItem value="both" sx={{ fontSize: "11.5px", fontWeight: 700, color: "#4f46e5" }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#7c3aed", mr: 0.8, display: "inline-block" }} />
                    Both (Combined)
                  </MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Divider orientation="vertical" flexItem sx={{ height: 18, my: "auto" }} />

            <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "10.5px", textTransform: "uppercase" }}>
              Presets:
            </Typography>
            <Chip
              label="Today"
              size="small"
              clickable
              color={startDate === todayStr && endDate === todayStr ? "primary" : "default"}
              onClick={() => applyDatePreset("today")}
              sx={{ height: 22, fontSize: "10.5px" }}
            />
            <Chip
              label="This Month"
              size="small"
              clickable
              onClick={() => applyDatePreset("thisMonth")}
              sx={{ height: 22, fontSize: "10.5px" }}
            />
            <Chip
              label="This FY"
              size="small"
              clickable
              onClick={() => applyDatePreset("thisFY")}
              sx={{ height: 22, fontSize: "10.5px" }}
            />
            <Chip
              label="All Time"
              size="small"
              clickable
              color={!startDate && !endDate ? "primary" : "default"}
              onClick={() => applyDatePreset("all")}
              sx={{ height: 22, fontSize: "10.5px" }}
            />
          </Stack>

          {(startDate || endDate || expenseMadeBy !== "ALL" || partyName || searchTerm) && (
            <Button
              size="small"
              startIcon={<ClearIcon sx={{ fontSize: 13 }} />}
              onClick={() => {
                applyDatePreset("today");
                setExpenseMadeBy("ALL");
                setPartyName("");
                setSearchTerm("");
              }}
              sx={{ textTransform: "none", color: "#64748b", fontSize: "11px", py: 0.2, px: 0.8, height: 24 }}
            >
              Reset Filters
            </Button>
          )}
        </Box>

        {/* Row 2: Compact Filter Fields */}
        <Grid container spacing={1} alignItems="center">
          {/* From Date */}
          <Grid item xs={6} sm={2.4}>
            <TextField
              label="From Date"
              type="date"
              size="small"
              fullWidth
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiInputBase-root": { height: 30, fontSize: "11.5px" },
                "& .MuiInputLabel-root": { fontSize: "11px", top: "-2px" },
              }}
            />
          </Grid>

          {/* To Date */}
          <Grid item xs={6} sm={2.4}>
            <TextField
              label="To Date"
              type="date"
              size="small"
              fullWidth
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiInputBase-root": { height: 30, fontSize: "11.5px" },
                "& .MuiInputLabel-root": { fontSize: "11px", top: "-2px" },
              }}
            />
          </Grid>

          {/* Expense Made By Filter */}
          <Grid item xs={6} sm={2.4}>
            <FormControl fullWidth size="small">
              <Select
                value={expenseMadeBy}
                onChange={(e) => setExpenseMadeBy(e.target.value)}
                displayEmpty
                sx={{
                  height: 30,
                  fontSize: "11.5px",
                  "& .MuiSelect-select": { py: 0.4 },
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: "11.5px" }}>All Team Members</MenuItem>
                {teamMembers.map((m) => (
                  <MenuItem key={m} value={m} sx={{ fontSize: "11.5px" }}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Importer / Exporter */}
          <Grid item xs={6} sm={2.4}>
            <TextField
              placeholder="Search party..."
              size="small"
              fullWidth
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              sx={{
                "& .MuiInputBase-root": { height: 30, fontSize: "11.5px" },
                "& .MuiInputBase-input": { py: 0.4 },
              }}
            />
          </Grid>

          {/* Search particular / job */}
          <Grid item xs={12} sm={2.4}>
            <TextField
              placeholder="Ref / Particular..."
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 15 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiInputBase-root": { height: 30, fontSize: "11.5px" },
                "& .MuiInputBase-input": { py: 0.4 },
              }}
            />
          </Grid>
        </Grid>
      </Paper>`;

const startIdx = content.indexOf('  return (\n    <Box sx={{ width: "100%", p: 2');
const endIdx = content.indexOf('      {/* Main Ledger Table */}');

if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + newRenderBlock + '\n\n' + content.slice(endIdx);
  // Also adjust table maxHeight
  content = content.replace('maxHeight: "65vh"', 'maxHeight: "calc(100vh - 230px)"');
  
  try {
    parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated Exim-Export CashflowTracker to compact layout!');
  } catch (e) {
    console.error('Babel parse error:', e.message);
  }
} else {
  console.log('Indices not found in Exim-Export CashflowTracker', startIdx, endIdx);
}
