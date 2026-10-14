const fs = require('fs');
const parser = require('@babel/parser');

const filePath = 'C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/CashflowTracker.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `export default function CashflowTracker({ mode = "import" }) {
  const isExport = mode === "export";
  const apiBase = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_STRING)
    ? import.meta.env.VITE_API_STRING
    : "http://localhost:9002/api";`;

const replacement = `export default function CashflowTracker({ mode = "export" }) {
  const isExport = mode === "export";
  const defaultApiBase = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_STRING)
    ? import.meta.env.VITE_API_STRING
    : "http://localhost:9002/api";

  // Trade Scope: "import" | "export" | "both"
  const [tradeScope, setTradeScope] = useState(
    () => sessionStorage.getItem("cashflow_trade_scope") || mode || "export"
  );

  useEffect(() => {
    sessionStorage.setItem("cashflow_trade_scope", tradeScope);
  }, [tradeScope]);

  const { importApi, exportApi } = useMemo(() => {
    return getTradeApis(defaultApiBase, false);
  }, [defaultApiBase]);

  const apiBase = tradeScope === "import" ? importApi : exportApi;`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated apiBase and tradeScope in Exim-Export CashflowTracker!');
} else {
  console.log('Target block not found');
}
