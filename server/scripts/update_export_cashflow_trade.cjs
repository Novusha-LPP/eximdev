const fs = require('fs');
const parser = require('@babel/parser');

const filePath = 'C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/CashflowTracker.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add CompareArrows icon and getTradeApis import
if (!content.includes('CompareArrows')) {
  content = content.replace(
    'import DateRangeIcon from "@mui/icons-material/DateRange";',
    'import DateRangeIcon from "@mui/icons-material/DateRange";\nimport CompareArrowsIcon from "@mui/icons-material/CompareArrows";\nimport { getTradeApis } from "../../../utils/tradeScopeUtil";'
  );
}

// 2. Update CashflowTracker component initialization & api resolution
const oldStateBlock = `  const isExport = mode === "export";
  const envApi = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_STRING
    ? import.meta.env.VITE_API_STRING
    : typeof process !== "undefined" && (process.env?.VITE_API_STRING || process.env?.REACT_APP_API_STRING)
      ? (process.env.VITE_API_STRING || process.env.REACT_APP_API_STRING)
      : null;

  const apiBase = isExport
    ? (envApi || "http://localhost:9002/api")
    : (envApi || "http://localhost:9006/api");`;

const newStateBlock = `  const isExport = mode === "export";
  const envApi = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_STRING
    ? import.meta.env.VITE_API_STRING
    : typeof process !== "undefined" && (process.env?.VITE_API_STRING || process.env?.REACT_APP_API_STRING)
      ? (process.env.VITE_API_STRING || process.env.REACT_APP_API_STRING)
      : null;

  const defaultApiBase = isExport
    ? (envApi || "http://localhost:9002/api")
    : (envApi || "http://localhost:9006/api");

  // Trade Scope: "import" | "export" | "both"
  const [tradeScope, setTradeScope] = useState(
    () => sessionStorage.getItem("cashflow_trade_scope") || mode || "export"
  );

  useEffect(() => {
    sessionStorage.setItem("cashflow_trade_scope", tradeScope);
  }, [tradeScope]);

  const { importApi, exportApi } = useMemo(() => {
    return getTradeApis(defaultApiBase, !isExport);
  }, [defaultApiBase, isExport]);

  const apiBase = tradeScope === "import" ? importApi : exportApi;`;

if (content.includes(oldStateBlock)) {
  content = content.replace(oldStateBlock, newStateBlock);
} else {
  console.log('Could not find oldStateBlock in export CashflowTracker');
}

// 3. Update fetchData
const oldFetchData = `  // Fetch Cashflow Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (expenseMadeBy && expenseMadeBy !== "ALL") params.expenseMadeBy = expenseMadeBy;
      if (partyName) params.partyName = partyName;
      if (searchTerm) params.search = searchTerm;

      const res = await axios.get(\`\${apiBase}/cashflow\`, {
        params,
        withCredentials: true,
      });

      if (res.data?.success) {
        setRows(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (Array.isArray(res.data.teamMembers) && res.data.teamMembers.length > 0) {
          setTeamMembers(res.data.teamMembers);
        }
      }
    } catch (err) {
      console.error("Error loading cashflow records:", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, startDate, endDate, expenseMadeBy, partyName, searchTerm]);`;

const newFetchData = `  // Fetch Cashflow Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (expenseMadeBy && expenseMadeBy !== "ALL") params.expenseMadeBy = expenseMadeBy;
      if (partyName) params.partyName = partyName;
      if (searchTerm) params.search = searchTerm;

      if (tradeScope === "both") {
        const [resImport, resExport] = await Promise.allSettled([
          axios.get(\`\${importApi}/cashflow\`, { params, withCredentials: true }),
          axios.get(\`\${exportApi}/cashflow\`, { params, withCredentials: true }),
        ]);

        const importData = resImport.status === "fulfilled" && resImport.value.data?.success ? resImport.value.data : null;
        const exportData = resExport.status === "fulfilled" && resExport.value.data?.success ? resExport.value.data : null;

        const impRows = (importData?.data || []).map((r) => ({ ...r, tradeType: "IMPORT" }));
        const expRows = (exportData?.data || []).map((r) => ({ ...r, tradeType: "EXPORT" }));

        // Combined rows sorted by postingDate ascending
        const combined = [...impRows, ...expRows].sort(
          (a, b) => new Date(a.postingDate) - new Date(b.postingDate)
        );

        // Recalculate running cash balance chronologically across combined entries
        let running = 0;
        combined.forEach((r) => {
          if (r.isBalanceAddition) {
            running += Number(r.cashWith || 0);
          } else {
            running -= Number(r.expAmount || 0);
          }
          r.cashBal = running;
        });

        setRows(combined);

        let totAdded = 0;
        let totExp = 0;
        combined.forEach((r) => {
          totAdded += Number(r.cashWith || 0);
          totExp += Number(r.expAmount || 0);
        });

        setSummary({
          totalAddedBalance: totAdded,
          totalExpense: totExp,
          netBalance: totAdded - totExp,
          currentCashBalance: running,
        });

        const m1 = Array.isArray(importData?.teamMembers) ? importData.teamMembers : [];
        const m2 = Array.isArray(exportData?.teamMembers) ? exportData.teamMembers : [];
        const allMembers = [...new Set([...m1, ...m2])].sort();
        if (allMembers.length > 0) setTeamMembers(allMembers);
      } else {
        const targetApi = tradeScope === "export" ? exportApi : importApi;
        const currentTrade = tradeScope === "export" ? "EXPORT" : "IMPORT";
        const res = await axios.get(\`\${targetApi}/cashflow\`, {
          params,
          withCredentials: true,
        });

        if (res.data?.success) {
          const rowsWithTrade = (res.data.data || []).map((r) => ({
            ...r,
            tradeType: r.tradeType || currentTrade,
          }));
          setRows(rowsWithTrade);
          if (res.data.summary) {
            setSummary(res.data.summary);
          }
          if (Array.isArray(res.data.teamMembers) && res.data.teamMembers.length > 0) {
            setTeamMembers(res.data.teamMembers);
          }
        }
      }
    } catch (err) {
      console.error("Error loading cashflow records:", err);
    } finally {
      setLoading(false);
    }
  }, [importApi, exportApi, tradeScope, startDate, endDate, expenseMadeBy, partyName, searchTerm]);`;

if (content.includes(oldFetchData)) {
  content = content.replace(oldFetchData, newFetchData);
} else {
  console.log('Could not find oldFetchData in export CashflowTracker');
}

// 4. Update handleDeleteEntry
const oldHandleDelete = `  // Handle Delete Manual Entry
  const handleDeleteEntry = async (id, isBalance) => {
    const label = isBalance ? "Balance Addition / Cash Withdrawal" : "Manual Expense";
    if (!window.confirm(\`Are you sure you want to delete this \${label}?\`)) return;
    try {
      const res = await axios.delete(\`\${apiBase}/cashflow/\${id}\`, {
        withCredentials: true,
      });`;

const newHandleDelete = `  // Handle Delete Manual Entry
  const handleDeleteEntry = async (id, isBalance, rowTradeType) => {
    const label = isBalance ? "Balance Addition / Cash Withdrawal" : "Manual Expense";
    if (!window.confirm(\`Are you sure you want to delete this \${label}?\`)) return;
    try {
      const targetApi = (rowTradeType || "").toUpperCase() === "IMPORT" ? importApi : exportApi;
      const res = await axios.delete(\`\${targetApi}/cashflow/\${id}\`, {
        withCredentials: true,
      });`;

if (content.includes(oldHandleDelete)) {
  content = content.replace(oldHandleDelete, newHandleDelete);
} else {
  console.log('Could not find oldHandleDelete in export CashflowTracker');
}

// Update handleDelete call in table
content = content.replace(
  'onClick={() => handleDeleteEntry(row._id, row.isBalanceAddition)}',
  'onClick={() => handleDeleteEntry(row._id, row.isBalanceAddition, row.tradeType)}'
);

// 5. Update Excel columns to include TRADE
const oldExcelColumns = `      // Define Columns matching screenshot exactly
      sheet.columns = [
        { header: "POSTING DATE", key: "postingDate", width: 14 },`;

const newExcelColumns = `      // Define Columns matching screenshot exactly
      sheet.columns = [
        { header: "TRADE", key: "tradeType", width: 12 },
        { header: "POSTING DATE", key: "postingDate", width: 14 },`;

if (content.includes(oldExcelColumns)) {
  content = content.replace(oldExcelColumns, newExcelColumns);
}

// Update Excel addRow
content = content.replace(
  'const rowData = {\n          postingDate:',
  'const rowData = {\n          tradeType: (r.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase(),\n          postingDate:'
);

// 6. Add Combine Button and Dropdown in Filter Toolbar
const oldFilterHeader = `        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          {/* Quick Date Range Chips */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Quick Presets:
            </Typography>`;

const newFilterHeader = `        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          {/* Quick Date Range Chips & Trade Scope Controls */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {/* Trade Selector: Import, Export, Both */}
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Button
                size="small"
                variant={tradeScope === "both" ? "contained" : "outlined"}
                onClick={() => setTradeScope(tradeScope === "both" ? (mode || "export") : "both")}
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
            </Typography>`;

if (content.includes(oldFilterHeader)) {
  content = content.replace(oldFilterHeader, newFilterHeader);
} else {
  console.log('Could not find oldFilterHeader in export CashflowTracker');
}

// 7. Update TableHead to include TRADE
const oldTableHead = `            {/* Header row with YELLOW background matching screenshot */}
            <TableRow>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc" }}>
                POSTING DATE
              </TableCell>`;

const newTableHead = `            {/* Header row with YELLOW background matching screenshot */}
            <TableRow>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc" }}>
                TRADE
              </TableCell>
              <TableCell sx={{ backgroundColor: "#FFFF00", color: "#000", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #dcdcdc" }}>
                POSTING DATE
              </TableCell>`;

if (content.includes(oldTableHead)) {
  content = content.replace(oldTableHead, newTableHead);
}

// Update colSpan to 13
content = content.replace(/colSpan=\{12\}/g, 'colSpan={13}');

// 8. Update TableRow data to include TRADE cell
const oldTableRowData = `                    {/* Posting Date */}
                    <TableCell sx={{ fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #e2e8f0", color: rowTextColor, fontWeight: isWithdrawal ? 700 : 400 }}>
                      {formatDateDisplay(row.postingDate)}
                    </TableCell>`;

const newTableRowData = `                    {/* TRADE */}
                    <TableCell sx={{ fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #e2e8f0" }}>
                      <Chip
                        size="small"
                        label={(row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase()}
                        sx={{
                          height: 20,
                          fontSize: "9.5px",
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                          backgroundColor: (row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase() === "EXPORT" ? "#fef3c7" : "#e0f2fe",
                          color: (row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase() === "EXPORT" ? "#b45309" : "#0369a1",
                          border: "1px solid",
                          borderColor: (row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT")).toUpperCase() === "EXPORT" ? "#fde68a" : "#bae6fd",
                        }}
                      />
                    </TableCell>

                    {/* Posting Date */}
                    <TableCell sx={{ fontSize: "11px", whiteSpace: "nowrap", border: "1px solid #e2e8f0", color: rowTextColor, fontWeight: isWithdrawal ? 700 : 400 }}>
                      {formatDateDisplay(row.postingDate)}
                    </TableCell>`;

if (content.includes(oldTableRowData)) {
  content = content.replace(oldTableRowData, newTableRowData);
}

// Verify with Babel parser
try {
  parser.parse(content, {
    sourceType: 'module',
    plugins: ['jsx'],
  });
  console.log('Babel parsed Exim-Export CashflowTracker.jsx successfully!');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated CashflowTracker.jsx in Exim-Export successfully!');
} catch (err) {
  console.error('Syntax error parsing updated Exim-Export CashflowTracker:', err.message);
}
