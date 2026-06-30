import XLSX from "xlsx";

const filePath = "/home/aiserver/eximdev/RM_Procurement_SOP for Exim.xlsx";
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach((sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`\n--- Sheet: ${sheetName} ---`);
  data.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      if (cell !== undefined && cell !== null && cell !== "") {
        const str = String(cell).trim();
        // Ignore standard descriptions, checkbox characters, and labels
        if (
          !str.startsWith("☐") &&
          !str.includes("STAGE") &&
          !str.includes("Responsible:") &&
          !str.includes("Sheet:") &&
          str !== "Customer Name" &&
          str !== "Customer Contact / PO No." &&
          str !== "Order Date" &&
          str !== "Required Delivery Date" &&
          str !== "Sales Person Name" &&
          str !== "Sales Order Reference No." &&
          str !== "PR Number" &&
          str !== "PR Date" &&
          str !== "Raised By (Name)" &&
          str !== "Contact Number" &&
          str !== "RM Required By Date" &&
          str !== "Supplier Name" &&
          str !== "Contact Person" &&
          str !== "Phone / WhatsApp" &&
          str !== "Email" &&
          str !== "GST Number" &&
          str !== "Rate per kg (₹)" &&
          str !== "Qty Available (kg)" &&
          str !== "Brand / Origin" &&
          str !== "Certificates Provided" &&
          str !== "Payment Terms" &&
          str !== "Delivery Timeline" &&
          str !== "Minimum Order Quantity" &&
          str !== "Discount / Special Offer" &&
          str !== "Remarks"
        ) {
          // If it looks like actual data, print it
          console.log(`[R${rIdx+1}C${cIdx+1}]:`, str);
        }
      }
    });
  });
});
