const fs = require('fs');
const parser = require('@babel/parser');

const filePath = 'C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add CompareArrows icon & getTradeApis import
if (!content.includes('CompareArrows')) {
  content = content.replace(
    'import AttachFileIcon from "@mui/icons-material/AttachFile";',
    'import AttachFileIcon from "@mui/icons-material/AttachFile";\nimport CompareArrowsIcon from "@mui/icons-material/CompareArrows";\nimport { getTradeApis } from "../../../utils/tradeScopeUtil";'
  );
}

// 2. Add tradeScope state and API resolution in VirtualBalanceList
const oldHeaderState = `  const isCfsBalance = balanceType === "cfs";
  const balanceApi = isCfsBalance ? "cfs-virtual-balance" : "virtual-balance";
  const directoryApi = isCfsBalance ? "cfsCodes" : "emptyYardCodes";
  const balanceLabel = isCfsBalance ? "CFS-SFSA Virtual Balance" : "Empty-Yards Virtual Balance";
  const holderLabel = isCfsBalance ? "CFS-SFSA" : "Empty Yard";
  const [entries, setEntries] = useState([]);`;

const newHeaderState = `  const isCfsBalance = balanceType === "cfs";
  const balanceApi = isCfsBalance ? "cfs-virtual-balance" : "virtual-balance";
  const directoryApi = isCfsBalance ? "cfsCodes" : "emptyYardCodes";
  const balanceLabel = isCfsBalance ? "CFS-SFSA Virtual Balance" : "Empty-Yards Virtual Balance";
  const holderLabel = isCfsBalance ? "CFS-SFSA" : "Empty Yard";
  const [entries, setEntries] = useState([]);

  // Trade Scope: "import" | "export" | "both"
  const [tradeScope, setTradeScope] = useState(
    () => sessionStorage.getItem(\`vb_trade_scope_\${balanceType}\`) || "export"
  );

  useEffect(() => {
    sessionStorage.setItem(\`vb_trade_scope_\${balanceType}\`, tradeScope);
  }, [tradeScope, balanceType]);

  const { importApi, exportApi } = React.useMemo(() => {
    const raw = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_STRING
      ? import.meta.env.VITE_API_STRING
      : "http://localhost:9002/api";
    return getTradeApis(raw, false);
  }, []);`;

if (content.includes(oldHeaderState)) {
  content = content.replace(oldHeaderState, newHeaderState);
  console.log('Replaced header state');
} else {
  console.log('Could not find oldHeaderState');
}

// 3. Update fetchEntries
const oldFetchEntries = `  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(\`\${import.meta.env.VITE_API_STRING}/\${balanceApi}\`, {
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
        const entriesData = Array.isArray(rawData) ? rawData : (rawData?.entries || []);
        const totalCount = res.data.pagination?.totalRecords ?? rawData?.total ?? entriesData.length;
        const totalP = res.data.pagination?.totalPages ?? rawData?.totalPages ?? 1;
        setEntries(entriesData);
        setTotal(totalCount);
        setTotalPages(totalP);
        if (res.data.summary || rawData?.summary) {
          setSummary(res.data.summary || rawData?.summary);
        }
      }
    } catch (err) {
      console.error(\`Error fetching \${balanceLabel}:\`, err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, startDate, endDate, balanceApi, balanceLabel]);`;

const newFetchEntries = `  const fetchEntries = useCallback(async () => {
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
        const targetApi = tradeScope === "import" ? importApi : exportApi;
        const currentTrade = tradeScope === "import" ? "IMPORT" : "EXPORT";
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
          if (res.data.summary || rawData?.summary) {
            setSummary(res.data.summary || rawData?.summary);
          }
        }
      }
    } catch (err) {
      console.error(\`Error fetching \${balanceLabel}:\`, err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, startDate, endDate, balanceApi, balanceLabel, tradeScope, importApi, exportApi]);`;

if (content.includes(oldFetchEntries)) {
  content = content.replace(oldFetchEntries, newFetchEntries);
  console.log('Replaced fetchEntries');
} else {
  console.log('Could not find oldFetchEntries');
}

// 4. Update handleExportExcel
const oldExportExcel = `  const handleExportExcel = async () => {
    try {
      const res = await axios.get(\`\${import.meta.env.VITE_API_STRING}/\${balanceApi}\`, {
        params: {
          page: 1,
          limit: 1000000,
          search: debouncedSearch,
          status: statusFilter,
          startDate,
          endDate,
        },
      });
      if (res.data.success && Array.isArray(res.data.data)) {
        const XLSX = await import("xlsx");
        
        const dataToExport = res.data.data.map((row) => ({
          "Create Date": row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "-",
          "Ref No": row.referenceNo || "",
          [\`\${holderLabel} Name\`]: row.cfsName || "",
          "Job No": row.jobNo || "",
          "Exporter Name": cleanPartyName(row.partyName) || "",`;

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
        const targetApi = tradeScope === "import" ? importApi : exportApi;
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
          "Trade": row.tradeType || (tradeScope === "import" ? "IMPORT" : "EXPORT"),
          "Create Date": row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "-",
          "Ref No": row.referenceNo || "",
          [\`\${holderLabel} Name\`]: row.cfsName || "",
          "Job No": row.jobNo || "",
          "Importer / Exporter Name": cleanPartyName(row.partyName) || "",`;

if (content.includes(oldExportExcel)) {
  content = content.replace(oldExportExcel, newExportExcel);
  console.log('Replaced exportExcel');
} else {
  console.log('Could not find oldExportExcel');
}

// 5. Add Combine Button and Trade Dropdown into Filter Stack
const oldFilterStack = `        <FormControl size="small" sx={{ width: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            sx={{ borderRadius: "6px" }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
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
            sx={{ borderRadius: "6px" }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
          </Select>
        </FormControl>

        {/* Trade Scope Control: Import / Export / Both */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant={tradeScope === "both" ? "contained" : "outlined"}
            onClick={() => {
              setTradeScope(tradeScope === "both" ? "export" : "both");
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
  console.log('Replaced filterStack');
} else {
  console.log('Could not find oldFilterStack');
}

try {
  parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
  console.log('Babel verified Exim-Export VirtualBalanceList.jsx successfully!');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Saved Exim-Export VirtualBalanceList.jsx successfully!');
} catch (err) {
  console.error('Babel error:', err.message);
}
