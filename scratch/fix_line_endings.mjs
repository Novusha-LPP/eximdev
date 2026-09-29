import fs from "fs";
const path = "C:/Users/india/Desktop/projects/eximdev/server/routes/accounts/fleetInsuranceSop.mjs";
let content = fs.readFileSync(path, "utf8");
content = content.replace(/\r\n/g, "\n");
fs.writeFileSync(path, content, "utf8");
console.log("Done normalizing fleetInsuranceSop.mjs CRLF to LF");
