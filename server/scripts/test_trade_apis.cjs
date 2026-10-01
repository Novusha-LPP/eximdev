function getTradeApis(currentBaseUrl, isImportProject = true) {
  let importApi = "";
  let exportApi = "";

  const base = (currentBaseUrl || "").trim().replace(/\/+$/, "");

  if (base.includes("/import/api")) {
    importApi = base;
    exportApi = base.replace("/import/api", "/export/api");
  } else if (base.includes("/export/api")) {
    exportApi = base;
    importApi = base.replace("/export/api", "/import/api");
  } else if (base.includes(":9006")) {
    importApi = base;
    exportApi = base.replace(":9006", ":9002");
  } else if (base.includes(":9002")) {
    exportApi = base;
    importApi = base.replace(":9002", ":9006");
  } else {
    if (isImportProject) {
      importApi = base || "http://localhost:9006/api";
      exportApi = (base || "http://localhost:9006/api").replace(/9006/g, "9002");
    } else {
      exportApi = base || "http://localhost:9002/api";
      importApi = (base || "http://localhost:9002/api").replace(/9002/g, "9006");
    }
  }

  return { importApi, exportApi };
}

console.log('Test 1 (localhost 9006):', getTradeApis('http://localhost:9006/api', true));
console.log('Test 2 (localhost 9002):', getTradeApis('http://localhost:9002/api', false));
console.log('Test 3 (prod import):', getTradeApis('https://eximbot.alvision.in/import/api', true));
console.log('Test 4 (prod export):', getTradeApis('https://eximbot.alvision.in/export/api', false));
console.log('Test 5 (LAN 192.168.1.50):', getTradeApis('http://192.168.1.50:9006/api', true));
