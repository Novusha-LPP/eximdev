import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Captures an HTML element as it appears on screen and downloads it as a high-quality A4 PDF.
 * @param {HTMLElement} element - The DOM element to capture (e.g., the billing div)
 * @param {string} fileName - The name of the downloaded file
 */
export const downloadInvoiceAsPDF = async (element, fileName = 'Invoice.pdf') => {
    if (!element) return;

    try {
        // Clone the element to safely modify it for printing
        const clone = element.cloneNode(true);
        
        // Apply print-friendly styling resets
        clone.style.transform = 'none';
        clone.style.margin = '0';
        clone.style.boxShadow = 'none';
        clone.style.width = '210mm'; // Set to exact A4 width temporarily for accurate height measurement
        clone.style.minHeight = '0'; // Remove min-height restriction to measure true content height
        clone.style.padding = '0'; // Padding handled entirely by print wrapper
        clone.style.backgroundColor = '#ffffff';

        // Hide elements not intended for print
        const noPrintElements = clone.querySelectorAll('.no-print');
        noPrintElements.forEach(el => el.style.display = 'none');

        // Convert inputs/textareas to plain text blocks to preserve their values
        const inputs = clone.querySelectorAll('.abi-input');
        inputs.forEach(input => {
            const txt = document.createElement('span');
            txt.innerText = input.value || '';
            
            // Maintain styling fidelity
            txt.style.display = 'inline-block';
            txt.style.width = '100%';
            txt.style.fontFamily = 'inherit';
            txt.style.fontSize = 'inherit';
            txt.style.fontWeight = input.style.fontWeight || 'inherit';
            
            if (input.style.textAlign) {
                txt.style.textAlign = input.style.textAlign;
            }

            input.parentNode.replaceChild(txt, input);
        });

        // Temporarily append the clone to the DOM to measure its true height accurately
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        document.body.appendChild(clone);
        const trueContentHeight = clone.scrollHeight;
        document.body.removeChild(clone);

        const safeA4HeightPx = 1040; // ~275mm in pixels, leaving room for the 10mm top/bottom padding
        let scaleRatio = 1;
        
        if (trueContentHeight > safeA4HeightPx) {
            scaleRatio = safeA4HeightPx / trueContentHeight;
        }

        // Now prepare the clone to fill 100% of its printed container
        clone.style.position = 'static';
        clone.style.visibility = 'visible';
        clone.style.width = '100%';

        // Create an invisible iframe to handle the print rendering
        const printIframe = document.createElement('iframe');
        printIframe.style.position = 'absolute';
        printIframe.style.width = '0px';
        printIframe.style.height = '0px';
        printIframe.style.border = 'none';
        document.body.appendChild(printIframe);

        const iframeDoc = printIframe.contentWindow.document;

        // Copy all stylesheets to ensure identical formatting
        const styleNodes = document.querySelectorAll('style, link[rel="stylesheet"]');
        let stylesHtml = '';
        styleNodes.forEach(node => {
            stylesHtml += node.outerHTML;
        });

        // Enforce A4 layout, apply dynamic scale to fit one page, and prevent page breaks
        const printSpecificCSS = `
            <style>
                @page { size: A4 portrait; margin: 0; }
                body { 
                    margin: 0; 
                    padding: 0; 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                    background-color: white; 
                }
                .single-page-wrapper {
                    width: 100%;
                    height: 297mm;
                    box-sizing: border-box;
                    padding: 10mm; /* This applies the 10mm margin to the PDF output */
                    overflow: hidden;
                    display: block;
                }
                .scaled-content {
                    transform: scale(${scaleRatio});
                    transform-origin: top left;
                    width: ${100 / scaleRatio}%;
                }
            </style>
        `;

        iframeDoc.open();
        iframeDoc.write('<!DOCTYPE html><html><head><title>' + fileName + '</title>');
        iframeDoc.write(stylesHtml);
        iframeDoc.write(printSpecificCSS);
        iframeDoc.write('</head><body>');
        iframeDoc.write('<div class="single-page-wrapper"><div class="scaled-content">');
        iframeDoc.write(clone.outerHTML);
        iframeDoc.write('</div></div>');
        iframeDoc.write('</body></html>');
        iframeDoc.close();

        // Allow a brief moment for styles/fonts to apply before triggering print
        setTimeout(() => {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
            
            // Cleanup iframe after print dialog completes
            setTimeout(() => {
                document.body.removeChild(printIframe);
            }, 1000);
        }, 500);

    } catch (error) {
        console.error('PDF Print Error:', error);
    }
};
