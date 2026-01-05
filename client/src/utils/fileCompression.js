import imageCompression from "browser-image-compression";
import { PDFDocument } from 'pdf-lib';
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

// Use the local worker file we copied to the public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";






/**
 * Compresses a file if it exceeds a certain size.
 * Supports image compression, aggressive PDF page-to-image optimization, and Office document optimization.
 * @param {File} file - The file to compress.
 * @param {number} maxSizeKB - The maximum allowed size in KB (default 900).
 * @returns {Promise<File>} - The compressed file or the original if not compressible.
 */
export const compressFile = async (file, maxSizeKB = 900) => {
    // If file is already smaller than the max size, return it as is
    if (file.size <= maxSizeKB * 1024) {
        return file;
    }

    console.log(`Checking compression for: ${file.name}, Size: ${(file.size / 1024).toFixed(2)}KB`);

    // 1. Image Compression (In-Browser)
    if (file.type.startsWith("image/")) {
        const options = {
            maxSizeMB: maxSizeKB / 1024,
            useWebWorker: true,
            initialQuality: 0.8,
        };

        try {
            const compressedBlob = await imageCompression(file, options);
            return new File([compressedBlob], file.name, {
                type: file.type,
                lastModified: Date.now(),
            });
        } catch (error) {
            console.error("Image compression failed, returning original file:", error);
            return file;
        }
    }

    // 2. PDF Aggressive Optimization (Page-to-Image Re-packing)
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
        try {
            console.log("Starting Aggressive PDF Optimization (Rendering to Images)...");
            const arrayBuffer = await file.arrayBuffer();

            // First, try standard optimization (metadata stripping)
            let pdfDoc = await PDFDocument.load(arrayBuffer);
            pdfDoc.setTitle("");
            pdfDoc.setAuthor("");
            pdfDoc.setProducer("");
            pdfDoc.setCreator("");
            const simpleOptimizedBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultMetadata: false });

            // If the user wants significant compression and standard fails (~2.8MB case), 
            // we proceed to the "destructive" image-based approach.
            if (simpleOptimizedBytes.length > maxSizeKB * 1024) {
                console.log("Standard PDF optimization insufficient. Re-building PDF from compressed images...");

                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                const outPdf = await PDFDocument.create();

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 }); // Good balance of quality and size

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport }).promise;

                    // Convert canvas to blob
                    const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));

                    // Further compress the image to hit our targets
                    const compressedImageBlob = await imageCompression(jpegBlob, {
                        maxSizeMB: (maxSizeKB / 1024) / pdf.numPages,
                        useWebWorker: true,
                        initialQuality: 0.7
                    });

                    const imageBytes = await compressedImageBlob.arrayBuffer();
                    const embeddedImage = await outPdf.embedJpg(imageBytes);
                    const newPage = outPdf.addPage([viewport.width, viewport.height]);
                    newPage.drawImage(embeddedImage, {
                        x: 0,
                        y: 0,
                        width: viewport.width,
                        height: viewport.height,
                    });
                }

                const finalBytes = await outPdf.save();

                if (finalBytes.length < file.size) {
                    const reduction = ((file.size - finalBytes.length) / file.size * 100).toFixed(2);
                    console.log(`PDF aggressively optimized: ${(file.size / 1024).toFixed(2)}KB -> ${(finalBytes.length / 1024).toFixed(2)}KB (-${reduction}%)`);
                    return new File([finalBytes], file.name, {
                        type: "application/pdf",
                        lastModified: Date.now(),
                    });
                }
            } else {
                console.log(`Standard PDF optimization worked: ${(simpleOptimizedBytes.length / 1024).toFixed(2)}KB`);
                return new File([simpleOptimizedBytes], file.name, {
                    type: "application/pdf",
                    lastModified: Date.now(),
                });
            }
        } catch (error) {
            console.error("PDF aggressive optimization failed:", error);
        }
    }

    // 3. Office Documents (Word/Excel/PowerPoint)
    const officeMimeTypes = [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ];

    if (officeMimeTypes.includes(file.type)) {
        try {
            const zip = await JSZip.loadAsync(file);
            const mediaFiles = [];

            zip.forEach((relativePath, fileEntry) => {
                if (relativePath.match(/\.(jpg|jpeg|png)$/i)) {
                    mediaFiles.push({ path: relativePath, entry: fileEntry });
                }
            });

            if (mediaFiles.length > 0) {
                console.log(`Found ${mediaFiles.length} images inside Office document. Compressing...`);
                await Promise.all(mediaFiles.map(async (media) => {
                    try {
                        const content = await media.entry.async("blob");
                        const compressed = await imageCompression(content, {
                            maxSizeMB: (maxSizeKB / 1024) * 0.5,
                            maxWidthOrHeight: 1280,
                            useWebWorker: true,
                            initialQuality: 0.6
                        });
                        zip.file(media.path, compressed);
                        return true;
                    } catch (e) {
                        return false;
                    }
                }));

                const compressedBlob = await zip.generateAsync({
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: { level: 9 }
                });

                if (compressedBlob.size < file.size) {
                    const reduction = ((file.size - compressedBlob.size) / file.size * 100).toFixed(2);
                    console.log(`Office Doc optimized: ${(file.size / 1024).toFixed(2)}KB -> ${(compressedBlob.size / 1024).toFixed(2)}KB (-${reduction}%)`);
                    return new File([compressedBlob], file.name, {
                        type: file.type,
                        lastModified: Date.now(),
                    });
                }
            }
        } catch (error) {
            console.error("Office document compression failed:", error);
        }
    }

    return file;
};
