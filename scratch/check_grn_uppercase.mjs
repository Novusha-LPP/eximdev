// Verifies the REAL uppercaseDeep() from tyreProcurementSop.mjs keeps the
// S3 attachment URL intact while still uppercasing normal GRN text fields.
import fs from "fs";

const src = fs.readFileSync("server/routes/accounts/tyreProcurementSop.mjs", "utf8");
const fnSrc = src.match(/function uppercaseDeep[\s\S]*?\n}\n/)[0];
const uppercaseDeep = new Function(`${fnSrc}; return uppercaseDeep;`)();

const payload = {
  stage6: {
    grnSeriesNo: "grn/tyre/01/sep/26-27",
    referenceInfos: [
      {
        supplierName: "Patel Tyre",
        invoiceNumber: "inv-1001",
        invoiceDate: "2026-09-23", // keys ending in Date pass through untouched
        invoiceAmount: 12500,
        invoiceAttachment: "https://MyBucket.s3.ap-south-1.amazonaws.com/tyre-procurement/grn-invoices/Inv-1001-1727097600000.PDF",
        invoiceAttachmentName: "Inv-1001.pdf",
      },
    ],
  },
};

const out = uppercaseDeep(payload);
const info = out.stage6.referenceInfos[0];
console.log(JSON.stringify(info, null, 2));

const checks = [
  ["invoiceAttachment URL case preserved", info.invoiceAttachment === payload.stage6.referenceInfos[0].invoiceAttachment],
  ["attachment file name case preserved", info.invoiceAttachmentName === "Inv-1001.pdf"],
  ["invoiceNumber uppercased", info.invoiceNumber === "INV-1001"],
  ["supplierName uppercased", info.supplierName === "PATEL TYRE"],
  ["grnSeriesNo uppercased", out.stage6.grnSeriesNo === "GRN/TYRE/01/SEP/26-27"],
  ["invoiceDate untouched", info.invoiceDate === "2026-09-23"],
  ["invoiceAmount untouched", info.invoiceAmount === 12500],
];

let ok = true;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);
  if (!passed) ok = false;
}
process.exit(ok ? 0 : 1);
