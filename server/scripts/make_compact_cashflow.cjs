const fs = require('fs');
const parser = require('@babel/parser');

const filePath = 'C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/CashflowTracker.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Target the render return block from `<Box sx={{ width: "100%", p: 2` down to `<TableContainer`
const oldRenderBlock = `  return (
    <Box sx={{ width: "100%", p: 2, backgroundColor: "#f8fafc", minHeight: "85vh" }}>
      {/* Top Header Bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 2.5,
          backgroundColor: "#fff",
          p: 2,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <AccountBalanceWalletIcon sx={{ color: "#1976d2", fontSize: 32 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
              Cashflow Register
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              Track cash expenses, bank withdrawals & real-time cash balance
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => setBalanceModalOpen(true)}
            sx={{ fontWeight: 600, textTransform: "none", boxShadow: "none" }}
          >
            Add Balance
          </Button>

          <Button
            variant="contained"
            color="warning"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => setExpenseModalOpen(true)}
            sx={{
              fontWeight: 600,
              textTransform: "none",
              boxShadow: "none",
              backgroundColor: "#d97706",
              "&:hover": { backgroundColor: "#b45309" },
            }}
          >
            Add Cash Expense
          </Button>

          <Button
            variant="outlined"
            startIcon={<GroupIcon />}
            onClick={() => setTeamModalOpen(true)}
            sx={{ fontWeight: 600, textTransform: "none" }}
          >
            Team ({teamMembers.length})
          </Button>

          <Button
            variant="outlined"
            color="success"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportExcel}
            sx={{ fontWeight: 600, textTransform: "none" }}
          >
            Export Excel
          </Button>

          <IconButton onClick={fetchData} title="Refresh" color="primary">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* KPI Cards (Total Added Balance, Total Expense, Current Cash Balance) */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {/* Total Added Balance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: "5px solid #0284c7",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Total Added Balance
                </Typography>
                <TrendingUpIcon sx={{ color: "#0284c7", fontSize: 20 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#0284c7", mt: 0.5 }}>
                ₹{formatINR(summary.totalAddedBalance)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                Filtered range cash additions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Expense */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: "5px solid #dc2626",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Total Expense
                </Typography>
                <TrendingDownIcon sx={{ color: "#dc2626", fontSize: 20 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#dc2626", mt: 0.5 }}>
                ₹{formatINR(summary.totalExpense)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                Filtered range cash expenditures
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Period Cashflow */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: \`5px solid \${summary.netBalance >= 0 ? "#16a34a" : "#ea580c"}\`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Period Net Cashflow
                </Typography>
                {summary.netBalance >= 0 ? (
                  <TrendingUpIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                ) : (
                  <TrendingDownIcon sx={{ color: "#ea580c", fontSize: 20 }} />
                )}
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  color: summary.netBalance >= 0 ? "#16a34a" : "#ea580c",
                  mt: 0.5,
                }}
              >
                ₹{formatINR(summary.netBalance)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                Added Balance − Expenses
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Overall Running Cash Balance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              borderLeft: "5px solid #0f172a",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              backgroundColor: "#f1f5f9",
            }}
          >
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>
                  Current Cash Balance
                </Typography>
                <AccountBalanceWalletIcon sx={{ color: "#0f172a", fontSize: 20 }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  color: summary.currentCashBalance >= 0 ? "#16a34a" : "#dc2626",
                  mt: 0.5,
                }}
              >
                ₹{formatINR(summary.currentCashBalance)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b" }}>
                Lifetime cumulative balance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Paper
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          {/* Quick Date Range Chips & Trade Scope Controls */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {/* Trade Selector: Import, Export, Both */}
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Button
                size="small"
                variant={tradeScope === "both" ? "contained" : "outlined"}
                onClick={() => setTradeScope(tradeScope === "both" ? (mode || "import") : "both")}
                startIcon={<CompareArrowsIcon sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "12px",
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5,
                  ...(tradeScope === "both"
                    ? {
                        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                        color: "#fff",
                        boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
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
                      py: 0.5,
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

            <Divider orientation="vertical" flexItem sx={{ height: 22, my: "auto" }} />

            <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Quick Presets:
            </Typography>
            <Chip
              label="Today"
              size="small"
              clickable
              color={startDate === todayStr && endDate === todayStr ? "primary" : "default"}
              onClick={() => applyDatePreset("today")}
            />
            <Chip
              label="This Month"
              size="small"
              clickable
              onClick={() => applyDatePreset("thisMonth")}
            />
            <Chip
              label="This FY"
              size="small"
              clickable
              onClick={() => applyDatePreset("thisFY")}
            />
            <Chip
              label="All Time"
              size="small"
              clickable
              color={!startDate && !endDate ? "primary" : "default"}
              onClick={() => applyDatePreset("all")}
            />
          </Stack>

          {(startDate || endDate || expenseMadeBy !== "ALL" || partyName || searchTerm) && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={() => {
                applyDatePreset("today");
                setExpenseMadeBy("ALL");
                setPartyName("");
                setSearchTerm("");
              }}
              sx={{ textTransform: "none", color: "#64748b" }}
            >
              Reset Filters
            </Button>
          )}
        </Box>

        <Divider />

        <Grid container spacing={2} alignItems="center">
          {/* From Date */}
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              label="From Date"
              type="date"
              size="small"
              fullWidth
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* To Date */}
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              label="To Date"
              type="date"
              size="small"
              fullWidth
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Expense Made By Filter */}
          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <Select
                value={expenseMadeBy}
                onChange={(e) => setExpenseMadeBy(e.target.value)}
                displayEmpty
              >
                <MenuItem value="ALL">All Team Members</MenuItem>
                {teamMembers.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Importer / Exporter */}
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              label="Importer / Exporter"
              size="small"
              fullWidth
              placeholder="Search party..."
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
            />
          </Grid>

          {/* Search particular / job */}
          <Grid item xs={12} sm={12} md={2}>
            <TextField
              label="Search"
              size="small"
              fullWidth
              placeholder="Ref / Particular..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>`;

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
                onClick={() => setTradeScope(tradeScope === "both" ? (mode || "import") : "both")}
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

// Also make table cells compact
const oldTableContainer = `      {/* Main Ledger Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          maxHeight: "65vh",
          border: "1px solid #e2e8f0",
        }}
      >`;

const newTableContainer = `      {/* Main Ledger Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 1.5,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          maxHeight: "calc(100vh - 230px)",
          border: "1px solid #e2e8f0",
        }}
      >`;

let replaced = false;
content = content.replace(/\r\n/g, '\n');
const normOld = oldRenderBlock.replace(/\r\n/g, '\n');

if (content.includes(normOld)) {
  content = content.replace(normOld, newRenderBlock);
  replaced = true;
  console.log('Replaced render block in eximdev CashflowTracker');
} else {
  console.log('Could not find exact normOld render block, attempting slice replacement');
  const startIdx = content.indexOf('  return (\n    <Box sx={{ width: "100%", p: 2');
  const endIdx = content.indexOf('      {/* Main Ledger Table */}');
  if (startIdx !== -1 && endIdx !== -1) {
    content = content.slice(0, startIdx) + newRenderBlock + '\n\n' + content.slice(endIdx);
    replaced = true;
    console.log('Replaced render block by indices!');
  }
}

if (content.includes(oldTableContainer.replace(/\r\n/g, '\n'))) {
  content = content.replace(oldTableContainer.replace(/\r\n/g, '\n'), newTableContainer);
  console.log('Replaced table container sx');
}

if (replaced) {
  try {
    parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated eximdev CashflowTracker.jsx with compact layout!');
  } catch (err) {
    console.error('Babel error:', err.message);
  }
}
