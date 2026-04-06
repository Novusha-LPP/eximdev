import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper for Number to Words
const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        if ((n = n.toString()).length > 9) return 'overflow';
        let n_arr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n_arr) return '';
        let str = '';
        str += (Number(n_arr[1]) !== 0) ? (a[Number(n_arr[1])] || b[n_arr[1][0]] + ' ' + a[n_arr[1][1]]) + 'Crore ' : '';
        str += (Number(n_arr[2]) !== 0) ? (a[Number(n_arr[2])] || b[n_arr[2][0]] + ' ' + a[n_arr[2][1]]) + 'Lakh ' : '';
        str += (Number(n_arr[3]) !== 0) ? (a[Number(n_arr[3])] || b[n_arr[3][0]] + ' ' + a[n_arr[3][1]]) + 'Thousand ' : '';
        str += (Number(n_arr[4]) !== 0) ? (a[Number(n_arr[4])] || b[n_arr[4][0]] + ' ' + a[n_arr[4][1]]) + 'Hundred ' : '';
        str += (Number(n_arr[5]) !== 0) ? (a[Number(n_arr[5])] || b[n_arr[5][0]] + ' ' + a[n_arr[5][1]]) + 'Rupees ' : '';
        return str;
    };

    const parts = num.toString().split('.');
    let words = inWords(parts[0]);
    if (parts.length > 1 && Number(parts[1]) > 0) {
        words += 'and ' + (a[Number(parts[1])] || b[parts[1][0]] + ' ' + a[parts[1][1]]) + 'Paise ';
    }
    return words + 'Only';
};

const formatDate = (dateInput) => {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const generatePurchaseBookPDF = (data, logoUrl) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    const buildPdf = (logoImgBase64 = null) => {
        let currentY = 10;

        // --- 1. Header Box ---
        const headerHeight = 25;
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);
        doc.rect(margin, currentY, contentWidth, headerHeight);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('SURAJ FORWARDERS PVT LTD', margin + 2, currentY + 5);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const addressLines = [
            'A/204-205, WALL STREET II, OPP. ORIENT CLUB,',
            'NR. GUJARAT COLLEGE, ELLIS BRIDGE,',
            'AHMEDABAD - 380006, GUJARAT'
        ];
        doc.text(addressLines[0], margin + 2, currentY + 10);
        doc.text(addressLines[1], margin + 2, currentY + 14);
        doc.text(addressLines[2], margin + 2, currentY + 18);

        if (logoImgBase64) {
            const logoWidth = 35;
            const logoHeight = 20;
            const logoX = margin + contentWidth - logoWidth - 2;
            const logoY = currentY + 2.5;
            doc.setFillColor(255, 255, 255);
            doc.rect(logoX, logoY, logoWidth, logoHeight, 'F');
            doc.addImage(logoImgBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
        }

        currentY += headerHeight;

        // --- 2. Title ---
        doc.rect(margin, currentY, contentWidth, 8);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Bank Payment Advice', pageWidth / 2, currentY + 5.5, { align: 'center' });
        currentY += 8;

        // --- 3. To & Detail Split ---
        const detailHeight = 45;
        doc.rect(margin, currentY, contentWidth, detailHeight);
        doc.line(margin + contentWidth / 2, currentY, margin + contentWidth / 2, currentY + detailHeight);

        // To (Vendor)
        doc.setFontSize(9);
        doc.text('To,', margin + 2, currentY + 5);
        const recipientName = data.supplierName || data.paymentTo || 'N/A';
        doc.text(recipientName, margin + 2, currentY + 10);
        doc.setFont('helvetica', 'normal');
        const supplierAddr = `${data.supplierAddr1 || ''} ${data.supplierAddr2 || ''} ${data.supplierAddr3 || ''} ${data.supplierState || ''} ${data.supplierCountry || ''} ${data.supplierPin || ''}`.trim();
        const splitAddr = doc.splitTextToSize(supplierAddr || '-', (contentWidth / 2) - 5);
        doc.text(splitAddr, margin + 2, currentY + 15);

        // Payment Detail (Right)
        const rx = margin + (contentWidth / 2) + 2;
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Detail', rx, currentY + 5);
        doc.setFont('helvetica', 'normal');

        const taxable = Number(data.taxableValue || data.amount || 0);
        const gst = Number(data.igstAmt || 0) + Number(data.cgstAmt || 0) + Number(data.sgstAmt || 0);
        const tds = Number(data.tdsAmt || data.tds || 0);
        const net = Number(data.total || data.amount || 0);
        const grossVal = net + tds; // Gross paid to vendor before TDS

        const drawDetailRow = (lbl, val, y) => {
            doc.text(lbl, rx, y);
            const truncatedVal = String(val || '-').substring(0, 45); // Safety for long UTRs
            doc.text(': ' + truncatedVal, rx + 25, y);
        };

        const displayDate = data.entryDate || data.requestDate || data.supplierInvDate;
        drawDetailRow('Voucher No.', data.entryNo || data.requestNo, currentY + 10);
        drawDetailRow('Date', formatDate(displayDate), currentY + 15);
        drawDetailRow('Mode', 'Bank Payment', currentY + 20);
        const cleanUtr = String(data.utrNumber || '-').replace(/^\d{2}[-/]\d{2}[-/]\d{4}\s*/, '');
        drawDetailRow('RTGS No.', cleanUtr, currentY + 25);
        drawDetailRow('Ref Date', formatDate(data.entryDate || data.requestDate), currentY + 30);
        
        doc.setFont('helvetica', 'bold');
        drawDetailRow('Gross Payment', 'INR ' + grossVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), currentY + 35);
        drawDetailRow('Less TDS.', tds.toLocaleString('en-IN', { minimumFractionDigits: 2 }), currentY + 40);
        drawDetailRow('Net Payment.', 'INR ' + net.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' CR', currentY + 45);

        currentY += detailHeight + 5;

        // --- 4. Salutation ---
        doc.setFont('helvetica', 'bold');
        doc.text('Dear Sir/Madam', margin, currentY);
        currentY += 5;
        doc.setFont('helvetica', 'normal');
        doc.text('We are hereby making payment of the following bills as per the details mentioned herein', margin, currentY);
        currentY += 5;

        // --- 5. Bills Table ---
        doc.autoTable({
            startY: currentY,
            head: [['Sr', 'Invoice No', 'Date', 'Amount (INR)', 'Balance Amt (INR)', 'Gross Amt Paid', 'TDS Category and Rate', 'TDS (INR)', 'Net Amt Paid (INR)']],
            body: [[
                '1',
                data.supplierInvNo || '-',
                formatDate(data.supplierInvDate || data.requestDate),
                grossVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                grossVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                net.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                `U/S ${data.tdsSection || '194C'} ${Number(data.tdsRate || 0).toFixed(2)} %`,
                tds.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                net.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' DR'
            ]],
            foot: [[
                '', 'Total', '', 
                grossVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
                grossVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
                net.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
                '', 
                tds.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
                net.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' DR'
            ]],
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.5, halign: 'center', textColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 25 }, 2: { cellWidth: 20 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { cellWidth: 35 }, 7: { halign: 'right' }, 8: { halign: 'right' } },
            margin: { left: margin, right: margin }
        });

        currentY = doc.lastAutoTable.finalY;

        // --- 6. In Words ---
        doc.rect(margin, currentY, contentWidth, 8);
        doc.setFont('helvetica', 'normal');
        doc.text(`In Words INR ${numberToWords(net)}`, margin + 2, currentY + 5.5);
        currentY += 8;

        // --- 7. Signature Footer ---
        currentY += 5;
        doc.rect(margin, currentY, contentWidth, 20);
        doc.text('For SURAJ FORWARDERS PVT LTD', margin + 2, currentY + 5);
        doc.setFont('helvetica', 'bold');
        doc.text('Authorised Signatory', margin + 2, currentY + 17);

        identifier = data.entryNo || data.requestNo || 'N-A';
        doc.save(`PaymentAdvice_${(recipientName).replace(/\s+/g, '_')}_${identifier.replace(/\//g, '-')}.pdf`);
    };

    let identifier = '';
    if (logoUrl) {
        const img = new Image();
        img.src = logoUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            buildPdf(canvas.toDataURL('image/jpeg', 1.0));
        };
        img.onerror = () => buildPdf(null);
    } else {
        buildPdf(null);
    }
};
