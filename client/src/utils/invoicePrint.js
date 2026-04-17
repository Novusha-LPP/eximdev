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
        // Create a wrapper to temporarily reset scaling for clean capture
        // Alternatively, we can just use html2canvas with careful options
        const canvas = await html2canvas(element, {
            scale: 2, // High resolution
            useCORS: true, 
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc, clonedElement) => {
                // Reset screen-only transforms and margins that cause clipping
                clonedElement.style.transform = 'none';
                clonedElement.style.margin = '0';
                clonedElement.style.boxShadow = 'none';
                clonedElement.style.width = '210mm';
                clonedElement.style.minHeight = 'auto'; // Let it grow to its natural height for capture
                clonedElement.style.padding = '10mm';
                
                // Hide any gaps or parent styles that might interfere
                const wrapper = clonedElement.parentElement;
                if (wrapper) {
                    wrapper.style.padding = '0';
                    wrapper.style.margin = '0';
                    wrapper.style.background = '#fff';
                }

                // FIX FOR HTML2CANVAS INPUT CLIPPING:
                // Convert all inputs/textareas to plain text blocks to ensure flawless rendering
                const inputs = clonedElement.querySelectorAll('.abi-input');
                inputs.forEach(input => {
                    const txt = clonedDoc.createElement('span');
                    txt.innerText = input.value || '';
                    
                    // Maintain styling fidelity
                    txt.style.display = 'inline-block';
                    txt.style.width = '100%';
                    txt.style.fontFamily = 'inherit';
                    txt.style.fontSize = 'inherit';
                    txt.style.fontWeight = input.style.fontWeight || 'inherit';
                    
                    // Copy critical text alignments
                    if (input.style.textAlign) {
                        txt.style.textAlign = input.style.textAlign;
                    }

                    input.parentNode.replaceChild(txt, input);
                });
            }
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Calculate dimensions
        let imgWidth = pdfWidth;
        let imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

        // Force exactly on one page
        // If content is still too tall after reset, scale it down
        if (imgHeight > pdfHeight) {
            const ratio = pdfHeight / imgHeight;
            imgHeight = pdfHeight;
            imgWidth = imgWidth * ratio;
        }

        const xOffset = (pdfWidth - imgWidth) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, 0, imgWidth, imgHeight, undefined, 'FAST');
        
        pdf.save(fileName);
    } catch (error) {
        console.error('PDF Download Error:', error);
    }
};
