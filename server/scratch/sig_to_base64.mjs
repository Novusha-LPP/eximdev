import fs from 'fs';

const imgPath = 'C:\\eximdev\\client\\src\\assets\\images\\signature.png';
const buffer = fs.readFileSync(imgPath);
const base64 = buffer.toString('base64');
const dataUrl = `data:image/png;base64,${base64}`;

fs.writeFileSync('C:\\eximdev\\server\\scratch\\signature_base64.txt', dataUrl);
console.log('Successfully written base64 data to signature_base64.txt');
