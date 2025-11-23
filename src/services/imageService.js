const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageService {
    /**
     * Remove background from uploaded signature image
     * @param {string} imagePath - Path to the signature image
     * @returns {Promise<Buffer>} - Processed image buffer
     */
    async removeBackground(imagePath) {
        try {
            // Read the image
            const imageBuffer = await fs.readFile(imagePath);

            // Process with sharp to remove white/light backgrounds
            // This is a basic implementation - for better results, consider using remove.bg API
            const processed = await sharp(imageBuffer)
                .ensureAlpha() // Ensure image has alpha channel
                .raw()
                .toBuffer({ resolveWithObject: true });

            const { data, info } = processed;
            const { width, height, channels } = info;

            // Simple threshold-based background removal
            // Remove pixels that are close to white
            const threshold = 240; // Adjust this value (0-255)

            for (let i = 0; i < data.length; i += channels) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // If pixel is close to white, make it transparent
                if (r > threshold && g > threshold && b > threshold) {
                    data[i + 3] = 0; // Set alpha to 0 (transparent)
                }
            }

            // Convert back to PNG with transparency
            const result = await sharp(data, {
                raw: {
                    width,
                    height,
                    channels,
                },
            })
                .png()
                .toBuffer();

            return result;
        } catch (error) {
            console.error('Error removing background:', error);
            throw error;
        }
    }

    /**
     * Optimize signature image for PDF embedding
     * @param {string|Buffer} input - Path to image or buffer
     * @param {number} maxWidth - Maximum width
     * @returns {Promise<Buffer>} - Optimized PNG buffer
     */
    async optimizeForPdf(input, maxWidth = 300) {
        try {
            return await sharp(input)
                .resize(maxWidth, null, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .png()
                .toBuffer();
        } catch (error) {
            console.error('Error optimizing image:', error);
            throw error;
        }
    }

    /**
     * Process uploaded signature image
     * @param {string} imagePath - Path to uploaded image
     * @param {boolean} removeBackground - Whether to remove background
     * @returns {Promise<Buffer>} - Processed image buffer
     */
    async processSignature(imagePath, removeBackground = true) {
        try {
            let buffer;

            if (removeBackground) {
                buffer = await this.removeBackground(imagePath);
            } else {
                buffer = await fs.readFile(imagePath);
            }

            // Optimize for PDF
            return await this.optimizeForPdf(buffer);
        } catch (error) {
            console.error('Error processing signature:', error);
            throw error;
        }
    }

    /**
     * Convert canvas data URL to buffer
     * @param {string} dataUrl - Canvas data URL (data:image/png;base64,...)
     * @returns {Buffer} - Image buffer
     */
    dataUrlToBuffer(dataUrl) {
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
    }
}

module.exports = new ImageService();
