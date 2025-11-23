const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;

const imageService = require('../services/imageService');
const pdfService = require('../services/pdfService');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for signature image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(process.env.STORAGE_PATH || './storage', 'signatures');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PNG and JPEG images are allowed for signatures'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

// POST /api/signatures/:requestId/sign - Submit signature
router.post('/:requestId/sign', upload.single('signatureImage'), async (req, res) => {
    try {
        const { requestId } = req.params;
        const { signatureType, signatureData } = req.body;

        // Find the sign request
        const signRequest = await prisma.signRequest.findUnique({
            where: { uniqueLink: requestId },
        });

        if (!signRequest) {
            return res.status(404).json({ error: 'Sign request not found' });
        }

        if (signRequest.status !== 'PENDING') {
            return res.status(400).json({ error: 'This document has already been processed' });
        }

        let signatureBuffer;
        const signaturePath = path.join(
            process.env.STORAGE_PATH || './storage',
            'signatures',
            `signature-${Date.now()}-${uuidv4()}.png`
        );

        // Process signature based on type
        if (signatureType === 'DRAWN') {
            // Convert data URL to buffer
            if (!signatureData) {
                return res.status(400).json({ error: 'Signature data is required for drawn signatures' });
            }
            signatureBuffer = imageService.dataUrlToBuffer(signatureData);
        } else if (signatureType === 'UPLOADED') {
            // Process uploaded image with background removal
            if (!req.file) {
                return res.status(400).json({ error: 'Signature image is required for uploaded signatures' });
            }
            signatureBuffer = await imageService.processSignature(req.file.path, true);
        } else {
            return res.status(400).json({ error: 'Invalid signature type. Must be DRAWN or UPLOADED' });
        }

        // Save processed signature
        await fs.writeFile(signaturePath, signatureBuffer);

        // Get original PDF path
        const originalPdfPath = path.join(__dirname, '../..', signRequest.pdfUrl);

        // Embed signature on all designated areas
        const signedPdfBuffer = await pdfService.embedSignature(
            originalPdfPath,
            signatureBuffer,
            signRequest.signAreaCoords
        );

        // Save signed PDF
        const signedPdfFilename = `signed-${Date.now()}-${uuidv4()}.pdf`;
        const signedPdfPath = await pdfService.savePdf(signedPdfBuffer, signedPdfFilename);

        // Create or update signature record
        const signature = await prisma.signature.upsert({
            where: { requestId: signRequest.id },
            update: {
                signatureUrl: `/storage/signatures/${path.basename(signaturePath)}`,
                signedPdfUrl: signedPdfPath,
                type: signatureType,
                signedAt: new Date(),
                rejectionReason: null,
            },
            create: {
                requestId: signRequest.id,
                signatureUrl: `/storage/signatures/${path.basename(signaturePath)}`,
                signedPdfUrl: signedPdfPath,
                type: signatureType,
                signedAt: new Date(),
            },
        });

        // Update sign request status
        await prisma.signRequest.update({
            where: { id: signRequest.id },
            data: { status: 'SIGNED' },
        });

        res.json({
            success: true,
            message: 'Document signed successfully',
            signedPdfUrl: `${process.env.BASE_URL || 'http://localhost:3000'}${signedPdfPath}`,
        });
    } catch (error) {
        console.error('Error signing document:', error);
        res.status(500).json({ error: 'Failed to sign document', details: error.message });
    }
});

// POST /api/signatures/:requestId/reject - Reject signing
router.post('/:requestId/reject', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        // Find the sign request
        const signRequest = await prisma.signRequest.findUnique({
            where: { uniqueLink: requestId },
        });

        if (!signRequest) {
            return res.status(404).json({ error: 'Sign request not found' });
        }

        if (signRequest.status !== 'PENDING') {
            return res.status(400).json({ error: 'This document has already been processed' });
        }

        // Create or update signature record with rejection
        await prisma.signature.upsert({
            where: { requestId: signRequest.id },
            update: {
                rejectionReason: reason,
                signedAt: null,
            },
            create: {
                requestId: signRequest.id,
                signatureUrl: '',
                type: 'REJECTED',
                rejectionReason: reason,
            },
        });

        // Update sign request status
        await prisma.signRequest.update({
            where: { id: signRequest.id },
            data: { status: 'REJECTED' },
        });

        res.json({
            success: true,
            message: 'Document rejected',
        });
    } catch (error) {
        console.error('Error rejecting document:', error);
        res.status(500).json({ error: 'Failed to reject document' });
    }
});

// GET /api/signatures/:requestId/status - Check signing status
router.get('/:requestId/status', async (req, res) => {
    try {
        const { requestId } = req.params;

        const signRequest = await prisma.signRequest.findUnique({
            where: { uniqueLink: requestId },
            include: {
                signature: true,
                boss: true,
            },
        });

        if (!signRequest) {
            return res.status(404).json({ error: 'Sign request not found' });
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        res.json({
            status: signRequest.status,
            staffName: signRequest.staffName,
            bossName: signRequest.boss?.name || signRequest.manualBossName,
            createdAt: signRequest.createdAt,
            signedAt: signRequest.signature?.signedAt || null,
            signedPdfUrl: signRequest.signature?.signedPdfUrl
                ? `${baseUrl}${signRequest.signature.signedPdfUrl}`
                : null,
            rejectionReason: signRequest.signature?.rejectionReason || null,
        });
    } catch (error) {
        console.error('Error fetching signature status:', error);
        res.status(500).json({ error: 'Failed to fetch signature status' });
    }
});

// GET /api/signatures/:requestId/download - Download signed PDF
router.get('/:requestId/download', async (req, res) => {
    try {
        const { requestId } = req.params;

        const signRequest = await prisma.signRequest.findUnique({
            where: { uniqueLink: requestId },
            include: {
                signature: true,
            },
        });

        if (!signRequest) {
            return res.status(404).json({ error: 'Sign request not found' });
        }

        if (signRequest.status !== 'SIGNED' || !signRequest.signature?.signedPdfUrl) {
            return res.status(400).json({ error: 'Signed document not available' });
        }

        const filePath = path.join(__dirname, '../..', signRequest.signature.signedPdfUrl);
        res.download(filePath, `signed-document-${signRequest.id}.pdf`);
    } catch (error) {
        console.error('Error downloading signed PDF:', error);
        res.status(500).json({ error: 'Failed to download signed PDF' });
    }
});

module.exports = router;
