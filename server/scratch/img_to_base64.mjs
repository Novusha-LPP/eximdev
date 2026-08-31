import fs from 'fs';
import path from 'path';

const imgPath = 'C:\\Users\\NCP-1\\.gemini\\antigravity-ide\\brain\\fca25849-b4cd-41d2-8bbd-b37c8b7b3c82\\.user_uploaded\\media_1787047982812.png';
const buffer = fs.readFileSync(imgPath);
const base64 = buffer.toString('base64');
const dataUrl = `data:image/png;base64,${base64}`;

fs.writeFileSync('C:\\eximdev\\server\\scratch\\suraj_logo_base64.txt', dataUrl);
console.log('Successfully written base64 data to suraj_logo_base64.txt');
