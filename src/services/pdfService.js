const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

class PdfService {
    /**
     * Embed signature image into PDF at multiple designated areas
     * @param {string} pdfPath - Path to original PDF
     * @param {Buffer} signatureImageBuffer - Signature image buffer (PNG)
     * @param {Array} signAreaCoords - Array of {page, x, y, width, height}
     * @returns {Promise<Buffer>} - Signed PDF buffer
     */
    async embedSignature(pdfPath, signatureImageBuffer, signAreaCoords) {
        try {
            // Load the PDF
            const pdfBytes = await fs.readFile(pdfPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);

            // Embed the signature image
            const signatureImage = await pdfDoc.embedPng(signatureImageBuffer);
            const signatureDims = signatureImage.scale(1);

            // Iterate through all signature areas and embed on each
            for (const area of signAreaCoords) {
                const { page: pageNum, x, y, width, height } = area;

                // Get the page (0-indexed)
                const page = pdfDoc.getPage(pageNum - 1);
                const pageHeight = page.getHeight();

                // Calculate aspect ratio to fit signature in the designated area
                const aspectRatio = signatureDims.width / signatureDims.height;
                let sigWidth = width;
                let sigHeight = width / aspectRatio;

                // If height exceeds designated area, scale based on height instead
                if (sigHeight > height) {
                    sigHeight = height;
                    sigWidth = height * aspectRatio;
                }

                // Convert coordinates (PDF uses bottom-left origin)
                const pdfX = x;
                const pdfY = pageHeight - y - sigHeight;

                // Draw signature on this page
                page.drawImage(signatureImage, {
                    x: pdfX,
                    y: pdfY,
                    width: sigWidth,
                    height: sigHeight,
                });
            }

            // Save the modified PDF
            const signedPdfBytes = await pdfDoc.save();
            return Buffer.from(signedPdfBytes);
        } catch (error) {
            console.error('Error embedding signature:', error);
            throw error;
        }
    }

    /**
     * Get PDF page count
     * @param {string} pdfPath - Path to PDF file
     * @returns {Promise<number>} - Number of pages
     */
    async getPageCount(pdfPath) {
        try {
            const pdfBytes = await fs.readFile(pdfPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            return pdfDoc.getPageCount();
        } catch (error) {
            console.error('Error getting page count:', error);
            throw error;
        }
    }

    /**
     * Get PDF dimensions for a specific page
     * @param {string} pdfPath - Path to PDF file
     * @param {number} pageNum - Page number (1-indexed)
     * @returns {Promise<{width: number, height: number}>} - Page dimensions
     */
    async getPageDimensions(pdfPath, pageNum = 1) {
        try {
            const pdfBytes = await fs.readFile(pdfPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const page = pdfDoc.getPage(pageNum - 1);

            return {
                width: page.getWidth(),
                height: page.getHeight(),
            };
        } catch (error) {
            console.error('Error getting page dimensions:', error);
            throw error;
        }
    }

    /**
     * Save signed PDF to file
     * @param {Buffer} pdfBuffer - PDF buffer
     * @param {string} filename - Output filename
     * @returns {Promise<string>} - Path to saved file
     */
    async savePdf(pdfBuffer, filename) {
        try {
            const outputPath = path.join(
                process.env.STORAGE_PATH || './storage',
                'pdfs',
                filename
            );

            await fs.writeFile(outputPath, pdfBuffer);
            return `/storage/pdfs/${filename}`;
        } catch (error) {
            console.error('Error saving PDF:', error);
            throw error;
        }
    }
}

module.exports = new PdfService();
