import fs from 'fs';
import path from 'path';

function searchRoutes(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      searchRoutes(full);
    } else if (/\.(mjs|js)$/.test(e.name)) {
      if (/transport/i.test(full) || /procurement/i.test(full) || /accounts/i.test(full)) {
        console.log(full);
      }
    }
  }
}
searchRoutes('routes');
