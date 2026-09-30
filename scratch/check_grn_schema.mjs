// Confirms whether stage6.referenceInfos survives Mongoose strict casting
// with the CURRENT TyreProcurementSop schema. No DB connection required —
// document casting is synchronous.
import Model from "../server/model/accounts/tyreProcurementSop.mjs";

const doc = new Model({
  prNumber: "TEST-GRN-1",
  stage6: {
    grnSeriesNo: "GRN/TYRE/01/SEP/26-27",
    referenceInfos: [
      {
        supplierName: "PATEL TYRE",
        supplierContactNo: "97232 32812",
        invoiceNumber: "INV-1001",
        invoiceDate: "2026-09-23",
        invoiceAmount: 12500,
        invoiceAttachment: "https://example-bucket.s3.ap-south-1.amazonaws.com/tyre-procurement/grn-invoices/Inv-1001-1727097600000.pdf",
        invoiceAttachmentName: "Inv-1001.pdf",
      },
    ],
  },
});

const s6 = doc.stage6?.toObject ? doc.stage6.toObject() : doc.stage6;
console.log("stage6 keys:", Object.keys(s6 || {}));
console.log("referenceInfos:", JSON.stringify(s6?.referenceInfos ?? null, null, 2));

if (!s6?.referenceInfos) {
  console.log("\n>>> referenceInfos is STRIPPED by strict schema — per-supplier GRN fields never persist.");
  process.exit(1);
} else {
  console.log("\n>>> referenceInfos PERSISTS.");
  process.exit(0);
}
