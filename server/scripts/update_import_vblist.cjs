const fs = require('fs');
const parser = require('@babel/parser');

const filePath = 'C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/VirtualBalanceList.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add CompareArrows icon & getTradeApis import
if (!content.includes('CompareArrows')) {
  content = content.replace(
    'import AttachFileIcon from "@mui/icons-material/AttachFile";',
    'import AttachFileIcon from "@mui/icons-material/AttachFile";\nimport CompareArrowsIcon from "@mui/icons-material/CompareArrows";\nimport { getTradeApis } from "../../utils/tradeScopeUtil";'
  );
}

// 2. Add tradeScope state and API resolution in VirtualBalanceList
const oldHeaderState = `  const isCfsBalance = balanceType === "cfs";
  const balanceApi = isCfsBalance ? "cfs-virtual-balance" : "virtual-balance";
  const directoryApi = isCfsBalance ? "get-cfs-directory-list" : "get-empty-yard-directory-list";
  const balanceLabel = isCfsBalance ? "CFS-SFSA Virtual Balance" : "Terminal + Empty-Yards Virtual Balance";
  const holderLabel = isCfsBalance ? "CFS-SFSA" : "Terminal + Empty Yard";
  const [entries, setEntries] = useState([]);`;

const newHeaderState = `  const isCfsBalance = balanceType === "cfs";
  const balanceApi = isCfsBalance ? "cfs-virtual-balance" : "virtual-balance";
  const directoryApi = isCfsBalance ? "get-cfs-directory-list" : "get-empty-yard-directory-list";
  const balanceLabel = isCfsBalance ? "CFS-SFSA Virtual Balance" : "Terminal + Empty-Yards Virtual Balance";
  const holderLabel = isCfsBalance ? "CFS-SFSA" : "Terminal + Empty Yard";
  const [entries, setEntries] = useState([]);

  // Trade Scope: "import" | "export" | "both"
  const [tradeScope, setTradeScope] = useState(
    () => sessionStorage.getItem(\`vb_trade_scope_\${balanceType}\`) || "import"
  );

  useEffect(() => {
    sessionStorage.setItem(\`vb_trade_scope_\${balanceType}\`, tradeScope);
  }, [tradeScope, balanceType]);

  const { importApi, exportApi } = React.useMemo(() => {
    const raw = typeof process !== "undefined" && (process.env?.REACT_APP_API_STRING || process.env?.VITE_API_STRING)
      ? (process.env.REACT_APP_API_STRING || process.env.VITE_API_STRING)
      : "http://localhost:9006/api";
    return getTradeApis(raw, true);
  }, []);`;

if (content.includes(oldHeaderState)) {
  content = content.replace(oldHeaderState, newHeaderState);
} else {
  console.log('Could not find oldHeaderState');
}

// 3. Update fetchEntries
const oldFetchEntries = `  // Fetch virtual balance entries
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(\`\${process.env.REACT_APP_API_STRING}/\${balanceApi}\`, {
        params: {
          page,
          limit,
          search: debouncedSearch,
          status: statusFilter,
          startDate,
          endDate,
        },
      });
      if (res.data.success) {
        setEntries(res.data.data.entries);
        setTotal(res.data.data.total);
        setTotalPages(res.data.data.totalPages);
      }
    } catch (err) {
      console.error("Error fetching virtual balances:", err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, startDate, endDate, balanceApi]);`;

const newFetchEntries = `  // Fetch virtual balance entries
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      if (tradeScope === "both") {
        const [resImport, resExport] = await Promise.allSettled([
          axios.get(\`\${importApi}/\${balanceApi}\`, {
            params: {
              page: 1,
              limit: 1000,
              search: debouncedSearch,
              status: statusFilter,
              startDate,
              endDate,
            },
          }),
          axios.get(\`\${exportApi}/\${balanceApi}\`, {
            params: {
              page: 1,
              limit: 1000,
              search: debouncedSearch,
              status: statusFilter,
              startDate,
              endDate,
            },
          }),
        ]);

        const impRaw = resImport.status === "fulfilled" && resImport.value.data?.success ? resImport.value.data.data : null;
        const expRaw = resExport.status === "fulfilled" && resExport.value.data?.success ? resExport.value.data.data : null;

        const impEntries = (Array.isArray(impRaw) ? impRaw : (impRaw?.entries || [])).map((e) => ({ ...e, tradeType: "IMPORT" }));
        const expEntries = (Array.isArray(expRaw) ? expRaw : (expRaw?.entries || [])).map((e) => ({ ...e, tradeType: "EXPORT" }));

        const combined = [...impEntries, ...expEntries].sort(
          (a, b) => new Date(b.createdAt || b.paymentDate || 0) - new Date(a.createdAt || a.paymentDate || 0)
        );

        const totalCount = combined.length;
        const totalP = Math.max(1, Math.ceil(totalCount / limit));
        const pageEntries = combined.slice((page - 1) * limit, page * limit);

        setEntries(pageEntries);
        setTotal(totalCount);
        setTotalPages(totalP);
      } else {
        const targetApi = tradeScope === "export" ? exportApi : importApi;
        const currentTrade = tradeScope === "export" ? "EXPORT" : "IMPORT";
        const res = await axios.get(\`\${targetApi}/\${balanceApi}\`, {
          params: {
            page,
            limit,
            search: debouncedSearch,
            status: statusFilter,
            startDate,
            endDate,
          },
        });
        if (res.data.success) {
          const rawData = res.data.data;
          const entriesData = (Array.isArray(rawData) ? rawData : (rawData?.entries || [])).map((e) => ({
            ...e,
            tradeType: e.tradeType || currentTrade,
          }));
          const totalCount = res.data.pagination?.totalRecords ?? rawData?.total ?? entriesData.length;
          const totalP = res.data.pagination?.totalPages ?? rawData?.totalPages ?? 1;

          setEntries(entriesData);
          setTotal(totalCount);
          setTotalPages(totalP);
        }
      }
    } catch (err) {
      console.error("Error fetching virtual balances:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, startDate, endDate, balanceApi, tradeScope, importApi, exportApi]);`;

if (content.includes(oldFetchEntries)) {
  content = content.replace(oldFetchEntries, newFetchEntries);
} else {
  console.log('Could not find oldFetchEntries');
}

// 4. Update handleInlineFileUpload to route to proper api
const oldInlineUpload = `      const res = await axios.put(\`\${process.env.REACT_APP_API_STRING}/\${balanceApi}/\${rowId}\`, {
        fileUrl: result.Location,
      });`;

const newInlineUpload = `      const targetEntry = entries.find((e) => e._id === rowId);
      const targetApi = targetEntry?.tradeType === "EXPORT" ? exportApi : importApi;
      const res = await axios.put(\`\${targetApi}/\${balanceApi}/\${rowId}\`, {
        fileUrl: result.Location,
      });`;

if (content.includes(oldInlineUpload)) {
  content = content.replace(oldInlineUpload, newInlineUpload);
} else {
  console.log('Could not find oldInlineUpload');
}

// 5. Update handleDelete to route to proper api
const oldDelete = `  // Delete virtual balance
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await axios.delete(\`\${process.env.REACT_APP_API_STRING}/\${balanceApi}/\${id}\`);`;

const newDelete = `  // Delete virtual balance
  const handleDelete = async (id, rowTrade) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      const targetApi = (rowTrade || "").toUpperCase() === "EXPORT" ? exportApi : importApi;
      const res = await axios.delete(\`\${targetApi}/\${balanceApi}/\${id}\`);`;

if (content.includes(oldDelete)) {
  content = content.replace(oldDelete, newDelete);
} else {
  console.log('Could not find oldDelete');
}

// Update handleDelete call in table
content = content.replace(
  'onClick={() => handleDelete(row._id)}',
  'onClick={() => handleDelete(row._id, row.tradeType)}'
);

// 6. Update handleExportExcel
const oldExportExcel = `  const handleExportExcel = async () => {
    try {
      const res = await axios.get(\`\${process.env.REACT_APP_API_STRING}/\${balanceApi}\`, {
        params: {
          page: 1,
          limit: 1000000,
          search: debouncedSearch,
          status: statusFilter,
          startDate,
          endDate,
        },
      });
      if (res.data.success && Array.isArray(res.data.data.entries)) {
        const XLSX = await import("xlsx");
        
        const dataToExport = res.data.data.entries.map((row) => ({
          "Create Date": row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "-",
          "Ref No": row.referenceNo || "",
          [\`\${holderLabel} Name\`]: row.cfsName || "",
          "Job No": row.jobNo || "",
          "Importer Name": cleanPartyName(row.partyName) || "",`;

const newExportExcel = `  const handleExportExcel = async () => {
    try {
      let exportRows = [];
      const XLSX = await import("xlsx");

      if (tradeScope === "both") {
        const [resImport, resExport] = await Promise.allSettled([
          axios.get(\`\${importApi}/\${balanceApi}\`, {
            params: { page: 1, limit: 1000000, search: debouncedSearch, status: statusFilter, startDate, endDate },
          }),
          axios.get(\`\${exportApi}/\${balanceApi}\`, {
            params: { page: 1, limit: 1000000, search: debouncedSearch, status: statusFilter, startDate, endDate },
          }),
        ]);
        const impRaw = resImport.status === "fulfilled" && resImport.value.data?.success ? resImport.value.data.data : null;
        const expRaw = resExport.status === "fulfilled" && resExport.value.data?.success ? resExport.value.data.data : null;
        const impEntries = (Array.isArray(impRaw) ? impRaw : (impRaw?.entries || [])).map((e) => ({ ...e, tradeType: "IMPORT" }));
        const expEntries = (Array.isArray(expRaw) ? expRaw : (expRaw?.entries || [])).map((e) => ({ ...e, tradeType: "EXPORT" }));
        exportRows = [...impEntries, ...expEntries].sort(
          (a, b) => new Date(b.createdAt || b.paymentDate || 0) - new Date(a.createdAt || a.paymentDate || 0)
        );
      } else {
        const targetApi = tradeScope === "export" ? exportApi : importApi;
        const res = await axios.get(\`\${targetApi}/\${balanceApi}\`, {
          params: { page: 1, limit: 1000000, search: debouncedSearch, status: statusFilter, startDate, endDate },
        });
        if (res.data.success) {
          const rawData = res.data.data;
          exportRows = (Array.isArray(rawData) ? rawData : (rawData?.entries || [])).map((e) => ({
            ...e,
            tradeType: tradeScope.toUpperCase(),
          }));
        }
      }

      if (exportRows.length > 0) {
        const dataToExport = exportRows.map((row) => ({
          "Trade": row.tradeType || (tradeScope === "export" ? "EXPORT" : "IMPORT"),
          "Create Date": row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "-",
          "Ref No": row.referenceNo || "",
          [\`\${holderLabel} Name\`]: row.cfsName || "",
          "Job No": row.jobNo || "",
          "Importer / Exporter Name": cleanPartyName(row.partyName) || "",`;

if (content.includes(oldExportExcel)) {
  content = content.replace(oldExportExcel, newExportExcel);
} else {
  console.log('Could not find oldExportExcel');
}

// 7. Add Combine Button and Trade Dropdown into Filter Stack
const oldFilterStack = `        <FormControl size="small" sx={{ width: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
          >
            <MenuItem value="">ALL STATUS</MenuItem>
            <MenuItem value="paid">PAID</MenuItem>
            <MenuItem value="unpaid">UNPAID</MenuItem>
          </Select>
        </FormControl>`;

const newFilterStack = `        <FormControl size="small" sx={{ width: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
          >
            <MenuItem value="">ALL STATUS</MenuItem>
            <MenuItem value="paid">PAID</MenuItem>
            <MenuItem value="unpaid">UNPAID</MenuItem>
          </Select>
        </FormControl>

        {/* Trade Scope Control: Import / Export / Both */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant={tradeScope === "both" ? "contained" : "outlined"}
            onClick={() => {
              setTradeScope(tradeScope === "both" ? "import" : "both");
              setPage(1);
            }}
            startIcon={<CompareArrowsIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "12px",
              borderRadius: "6px",
              px: 1.5,
              py: 0.6,
              whiteSpace: "nowrap",
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

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Trade</InputLabel>
            <Select
              value={tradeScope}
              label="Trade"
              onChange={(e) => {
                setTradeScope(e.target.value);
                setPage(1);
              }}
              sx={{
                height: 40,
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                backgroundColor: "#fff",
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
        </Stack>`;

if (content.includes(oldFilterStack)) {
  content = content.replace(oldFilterStack, newFilterStack);
} else {
  console.log('Could not find oldFilterStack');
}

// 8. Update TableHead to include Trade column
const oldTh = `          <TableHead>
            <TableRow>
              <TableCell sx={s.headerCell}>Create Date</TableCell>`;

const newTh = `          <TableHead>
            <TableRow>
              <TableCell sx={s.headerCell}>Trade</TableCell>
              <TableCell sx={s.headerCell}>Create Date</TableCell>`;

if (content.includes(oldTh)) {
  content = content.replace(oldTh, newTh);
} else {
  console.log('Could not find oldTh');
}

// Update Importer Name header to be dynamic
content = content.replace(
  '<TableCell sx={s.headerCell}>Importer Name</TableCell>',
  '<TableCell sx={s.headerCell}>{tradeScope === "export" ? "Exporter Name" : tradeScope === "both" ? "Importer / Exporter" : "Importer Name"}</TableCell>'
);

// 9. Update TableRow data to include Trade cell
const oldTdRow = `                  <TableCell sx={{ color: "#475569" }}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "-"}
                  </TableCell>`;

const newTdRow = `                  <TableCell sx={{ fontSize: "11px", whiteSpace: "nowrap" }}>
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
                  <TableCell sx={{ color: "#475569" }}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "-"}
                  </TableCell>`;

if (content.includes(oldTdRow)) {
  content = content.replace(oldTdRow, newTdRow);
} else {
  console.log('Could not find oldTdRow');
}

// Update colSpan
content = content.replace(/colSpan=\{isCfsBalance \? 20 : 17\}/g, 'colSpan={isCfsBalance ? 21 : 18}');

// Verify with Babel parser
try {
  parser.parse(content, {
    sourceType: 'module',
    plugins: ['jsx'],
  });
  console.log('Babel parsed VirtualBalanceList.js successfully!');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated VirtualBalanceList.js in eximdev successfully!');
} catch (err) {
  console.error('Syntax error parsing updated VirtualBalanceList:', err.message);
}
