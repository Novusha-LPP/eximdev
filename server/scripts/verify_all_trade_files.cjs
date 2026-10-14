const fs = require('fs');
const parser = require('@babel/parser');

const files = [
  {
    name: 'eximdev tradeScopeUtil.js',
    path: 'C:/Users/india/Desktop/projects/eximdev/client/src/utils/tradeScopeUtil.js',
  },
  {
    name: 'Exim-Export tradeScopeUtil.js',
    path: 'C:/Users/india/Desktop/projects/Exim-Export/client/src/utils/tradeScopeUtil.js',
  },
  {
    name: 'eximdev CashflowTracker.jsx',
    path: 'C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/CashflowTracker.jsx',
  },
  {
    name: 'eximdev VirtualBalanceList.js',
    path: 'C:/Users/india/Desktop/projects/eximdev/client/src/components/Import-billing/VirtualBalanceList.js',
  },
  {
    name: 'Exim-Export CashflowTracker.jsx',
    path: 'C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/CashflowTracker.jsx',
  },
  {
    name: 'Exim-Export VirtualBalanceList.jsx',
    path: 'C:/Users/india/Desktop/projects/Exim-Export/client/src/components/Export/Export-Billing/VirtualBalanceList.jsx',
  },
];

let allPassed = true;

files.forEach(f => {
  try {
    const content = fs.readFileSync(f.path, 'utf8');
    parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
    console.log(`[PASS] ${f.name} (Valid syntax, ${content.length} bytes)`);

    if (f.name.includes('CashflowTracker') || f.name.includes('VirtualBalanceList')) {
      const checks = [
        'tradeScope',
        'Combine (Both)',
        'CompareArrowsIcon',
        'Import Only',
        'Export Only',
        'Both (Combined)',
        'TRADE',
      ];
      checks.forEach(c => {
        if (!content.includes(c)) {
          console.error(`[FAIL] ${f.name} missing check: "${c}"`);
          allPassed = false;
        }
      });
    }
  } catch (err) {
    console.error(`[ERROR] ${f.name}:`, err.message);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('\nALL 6 FILES FULLY VERIFIED AND PASS ALL CHECKS!');
} else {
  console.error('\nSome checks failed.');
}
