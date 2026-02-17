const XLSX = require('xlsx');

// Helper to generate dates
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
};

// 1. Generate 20 rows for Register Format
const registerRows = [];
for (let i = 1; i <= 20; i++) {
  registerRows.push({
    'Sr No': i.toString().padStart(4, '0'),
    'Job Status': i % 3 === 0 ? 'Completed' : (i % 2 === 0 ? 'Pending' : 'Active'),
    'JOB.No.': `JOB-REG-${2026000 + i}`,
    'Date': randomDate(new Date(2026, 0, 1), new Date(2026, 2, 1)),
    'Party\'s Name': `Client ${String.fromCharCode(65 + (i % 26))} Ltd.`,
    'Category': i % 2 === 0 ? 'ADVANCE AUTHORIZATION' : 'EPCG Authorization',
    'Licence Value / CIF Value': `${(i * 15000) + 10000} USD`,
    'Docs. Recvd. Date': randomDate(new Date(2026, 0, 5), new Date(2026, 2, 5)),
    'Application Prepared on': randomDate(new Date(2026, 0, 10), new Date(2026, 2, 10)),
    'Submited at DGFT on': randomDate(new Date(2026, 0, 15), new Date(2026, 2, 15)),
    'EFT Amount': (i * 500).toString(),
    'BID NO': `BID-${100 + i}`,
    'Date (BID)': randomDate(new Date(2026, 0, 20), new Date(2026, 2, 20)),
    'File No Key No.': `KEY-${9000 + i}`,
    'DATE (File)': randomDate(new Date(2026, 0, 25), new Date(2026, 2, 25)),
    'D/H': `DH-${i}`,
    'F/T Do': `FT-${i}`,
    'ADG': `ADG-${String.fromCharCode(88 + (i % 3))}`,
    'D.DG': `DDG-${String.fromCharCode(80 + (i % 3))}`,
    'Licence No.& date.': `LIC-${20260 + i} ${randomDate(new Date(2026, 1, 1), new Date(2026, 3, 1))}`,
    'Matter Complete / Closed date.': i % 5 === 0 ? randomDate(new Date(2026, 3, 1), new Date(2026, 4, 1)) : '',
    'Docs. handed over to A/c Dept.': i % 2 === 0 ? 'Yes' : 'No',
    'Remarks': i % 4 === 0 ? 'Urgent' : 'Routine processing',
    'Accounts INV. NO.': `INV-${5000 + i}`,
    'DATE (Accounts)': randomDate(new Date(2026, 3, 5), new Date(2026, 4, 1))
  });
}

// 2. Generate 20 rows for Authorization Registration
const authRows = [];
for (let i = 1; i <= 20; i++) {
  authRows.push({
    'JOB No': `JOB-AUTH-${2026500 + i}`,
    'Date': randomDate(new Date(2026, 0, 1), new Date(2026, 2, 1)),
    'party\'s name': `Partner ${String.fromCharCode(75 + (i % 20))} Inc.`,
    'Job Type': i % 2 === 0 ? 'Export' : 'Import',
    'Port Name': i % 3 === 0 ? 'Mundra' : 'JNPT',
    'Category': i % 2 === 0 ? 'ADVANCE AUTHORIZATION' : 'EPCG Authorization',
    'Licence No': `AUTH-LIC-${8000 + i}`,
    'Licence Date': randomDate(new Date(2025, 11, 1), new Date(2026, 1, 1)),
    'Licence Amount': (i * 250000).toString(),
    'LIC. RECD FROM PARTY': i % 3 === 0 ? 'No' : 'Yes',
    'Date (send to ICD\'s/Ports)': randomDate(new Date(2026, 1, 1), new Date(2026, 3, 1)),
    'BOND NO / CHALLAN NO.': `BOND-${700 + i}`,
    'IEC No.': `IEC-${10000 + (i*5)}`,
    'Completed': i % 4 === 0 ? 'Yes' : 'No',
    'Registration Date': randomDate(new Date(2026, 1, 15), new Date(2026, 3, 15)),
    'MONTH': ['January', 'February', 'March'][i % 3],
    'Billing Done or Not': i % 2 === 0 ? 'Done' : 'Pending',
    'Bill Number': i % 2 === 0 ? `BILL-${2026 - i}` : ''
  });
}

const wb1 = XLSX.utils.book_new();
const ws1 = XLSX.utils.json_to_sheet(registerRows);
XLSX.utils.book_append_sheet(wb1, ws1, 'Register Format');
XLSX.writeFile(wb1, 'dgft_register_format.xlsx');
console.log('dgft_register_format.xlsx created');

const wb2 = XLSX.utils.book_new();
const ws2 = XLSX.utils.json_to_sheet(authRows);
XLSX.utils.book_append_sheet(wb2, ws2, 'Authorization Registration');
XLSX.writeFile(wb2, 'dgft_authorization_registration.xlsx');
console.log('dgft_authorization_registration.xlsx created');
