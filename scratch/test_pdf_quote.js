const babel = require('@babel/core');
const fs = require('fs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const transpiled = babel.transformFileSync('src/components/crm/utils/pdfGenerator.js', {
  presets: ['@babel/preset-env', '@babel/preset-react']
}).code;

const Module = require('module');
const m = new Module('pdfGen');
m.paths = Module._nodeModulePaths(process.cwd());
m._compile(transpiled, 'pdfGenerator.js');

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const sampleQuote = {
  quoteNumber: 'QT-2026-00024',
  companyId: 'comp1',
  companyName: 'Via decretum vomer.',
  clientName: 'Atul Auto',
  attention: 'Narendra',
  items: [
    { description: 'PICKUP AHMEDABAD (ICD KHODIYAR) STUFFING : PIPLEJ /NAROL RETURN : MUNDRA - 20FT UP TO 14 TONS+', hsn: '9967', volume: '--', containerSize: '20FT', quantityInPieces: 'test', quantity: 1, rate: 0, discount: 0, taxRate: 12, amount: 0 },
    { description: 'PICKUP AHMEDABAD (ICD KHODIYAR) STUFFING : PIPLEJ /NAROL', hsn: '9967', volume: '--', containerSize: '20FT', quantityInPieces: 'test', quantity: 1, rate: 0, discount: 0, taxRate: 12, amount: 0 }
  ],
  total: 0
};

m.exports.buildQuotePDF(doc, sampleQuote);
console.log('PDF built successfully! Pages:', doc.getNumberOfPages());
