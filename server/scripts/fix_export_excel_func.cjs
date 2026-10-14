const fs = require('fs');
const parser = require('@babel/parser');

const filePath = 'C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldExport = `  const handleExportExcel = async () => {
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
      const rawEntries = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.entries || []);
      if (res.data.success && Array.isArray(rawEntries)) {
        const XLSX = await import("xlsx");
        
        const dataToExport = rawEntries.map((row) => ({
          "Create Date": row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "-",
          "Ref No": row.referenceNo || "",
          [\`\${holderLabel} Name\`]: row.cfsName || "",
          "Job No": row.jobNo || "",
          "Exporter Name": cleanPartyName(row.partyName) || "",`;

const newExport = `  const handleExportExcel = async () => {
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

if (content.includes(oldExport)) {
  content = content.replace(oldExport, newExport);
  parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated handleExportExcel in Exim-Export VirtualBalanceList!');
} else {
  console.log('Could not find oldExport in Exim-Export VirtualBalanceList');
}
