const fs = require('fs');
const path = 'C:/Users/Suraj-PC/vivek/eximdev/client/src/components/home/Home.js';
const buf = fs.readFileSync(path);
const hex = buf.slice(0, 80).toString('hex');
const raw = Array.from(buf.slice(0, 160)).map(b => (b <= 126 ? String.fromCharCode(b) : '\\x' + b.toString(16).padStart(2, '0'))).join('');
console.log('size=', buf.length);
console.log('hex=', hex);
console.log('preview=', raw);
