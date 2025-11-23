const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(process.env.STORAGE_PATH || './storage', 'pdfs');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});

// POST /api/sign-requests - Create new sign request
router.post('/', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        const { staffName, bossId, manualBossName, manualBossPhone, signAreaCoords } = req.body;

        // Validate required fields
        if (!staffName) {
            return res.status(400).json({ error: 'Staff name is required' });
        }

        if (!signAreaCoords || signAreaCoords.length === 0) {
            return res.status(400).json({ error: 'At least one signature area is required' });
        }

        // Validate boss selection
        if (!bossId && (!manualBossName || !manualBossPhone)) {
            return res.status(400).json({
                error: 'Please select a boss or provide manual boss details'
            });
        }

        // Parse sign area coords if it's a string
        let parsedSignAreaCoords = signAreaCoords;
        if (typeof signAreaCoords === 'string') {
            parsedSignAreaCoords = JSON.parse(signAreaCoords);
        }

        // Generate unique link ID
        const uniqueLink = uuidv4();

        // Create sign request
        const signRequest = await prisma.signRequest.create({
            data: {
                staffName,
                pdfUrl: `/storage/pdfs/${req.file.filename}`,
                bossId: bossId ? parseInt(bossId) : null,
                manualBossName: manualBossName || null,
                manualBossPhone: manualBossPhone || null,
                signAreaCoords: parsedSignAreaCoords,
                uniqueLink,
                status: 'PENDING',
            },
            include: {
                boss: true,
            },
        });

        // Generate shareable link
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const shareableLink = `${baseUrl}/sign/${uniqueLink}`;

        // Get boss phone number for WhatsApp
        const bossPhone = signRequest.boss?.phoneNumber || manualBossPhone;

        res.json({
            success: true,
            signRequest: {
                id: signRequest.id,
                uniqueLink,
                shareableLink,
                statusLink: `${baseUrl}/status/${uniqueLink}`,
                bossPhone,
            },
        });
    } catch (error) {
        console.error('Error creating sign request:', error);
        res.status(500).json({ error: 'Failed to create sign request', details: error.message });
    }
});

// GET /api/sign-requests/:linkId - Get request details by unique link
router.get('/:linkId', async (req, res) => {
    try {
        const { linkId } = req.params;

        const signRequest = await prisma.signRequest.findUnique({
            where: { uniqueLink: linkId },
            include: {
                boss: true,
                signature: true,
            },
        });

        if (!signRequest) {
            return res.status(404).json({ error: 'Sign request not found' });
        }

        // Return full URL for PDF
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        res.json({
            id: signRequest.id,
            staffName: signRequest.staffName,
            pdfUrl: `${baseUrl}${signRequest.pdfUrl}`,
            bossName: signRequest.boss?.name || signRequest.manualBossName,
            signAreaCoords: signRequest.signAreaCoords,
            status: signRequest.status,
            createdAt: signRequest.createdAt,
            signature: signRequest.signature ? {
                signedAt: signRequest.signature.signedAt,
                signedPdfUrl: signRequest.signature.signedPdfUrl ? `${baseUrl}${signRequest.signature.signedPdfUrl}` : null,
                rejectionReason: signRequest.signature.rejectionReason,
            } : null,
        });
    } catch (error) {
        console.error('Error fetching sign request:', error);
        res.status(500).json({ error: 'Failed to fetch sign request' });
    }
});

module.exports = router;
