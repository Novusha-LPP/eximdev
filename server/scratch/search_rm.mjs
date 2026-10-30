import fs from 'fs';
import path from 'path';

function searchRm(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      searchRm(full);
    } else if (/\.(js|jsx)$/.test(e.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        if (/checked|sign|approv|prepared/i.test(l)) {
          console.log(`${e.name}:${i+1}: ${l.trim().substring(0, 80)}`);
        }
      });
    }
  }
}

searchRm('client/src/components/accounts/rmProcurementSop');
