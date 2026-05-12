import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\india\\Desktop\\Projects\\eximdev\\client\\src\\components\\attendance\\Dashboard.jsx', 'utf8');

let openBraces = 0;
let closeBraces = 0;
let openParens = 0;
let closeParens = 0;

for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') openBraces++;
    if (content[i] === '}') closeBraces++;
    if (content[i] === '(') openParens++;
    if (content[i] === ')') closeParens++;
}

console.log(`Braces: { ${openBraces}, } ${closeBraces}`);
console.log(`Parens: ( ${openParens}, ) ${closeParens}`);

// Simple tag count (not perfect but helpful)
const openDivs = (content.match(/<div/g) || []).length;
const closeDivs = (content.match(/<\/div>/g) || []).length;
console.log(`Divs: <div ${openDivs}, </div> ${closeDivs}`);
