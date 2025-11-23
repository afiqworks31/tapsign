const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/admin/login - Admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find admin user
        const admin = await prisma.admin.findUnique({
            where: { username },
        });

        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Token expires in 7 days
        );

        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
            },
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/admin/statistics - Get dashboard statistics (protected)
router.get('/statistics', authMiddleware, async (req, res) => {
    try {
        const [total, pending, signed, rejected] = await Promise.all([
            prisma.signRequest.count(),
            prisma.signRequest.count({ where: { status: 'PENDING' } }),
            prisma.signRequest.count({ where: { status: 'SIGNED' } }),
            prisma.signRequest.count({ where: { status: 'REJECTED' } }),
        ]);

        res.json({
            total,
            pending,
            signed,
            rejected,
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /api/admin/requests - Get all sign requests with filters (protected)
router.get('/requests', authMiddleware, async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;

        const where = {};

        // Filter by status
        if (status && status !== 'all') {
            where.status = status.toUpperCase();
        }

        // Search by staff name or boss name
        if (search) {
            where.OR = [
                { staffName: { contains: search, mode: 'insensitive' } },
                { manualBossName: { contains: search, mode: 'insensitive' } },
                { boss: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [requests, total] = await Promise.all([
            prisma.signRequest.findMany({
                where,
                include: {
                    boss: true,
                    signature: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: parseInt(limit),
            }),
            prisma.signRequest.count({ where }),
        ]);

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        res.json({
            requests: requests.map(req => ({
                id: req.id,
                staffName: req.staffName,
                bossName: req.boss?.name || req.manualBossName,
                bossPhone: req.boss?.phoneNumber || req.manualBossPhone,
                status: req.status,
                createdAt: req.createdAt,
                signedAt: req.signature?.signedAt || null,
                rejectionReason: req.signature?.rejectionReason || null,
                uniqueLink: req.uniqueLink,
                statusLink: `${baseUrl}/status/${req.uniqueLink}`,
                signedPdfUrl: req.signature?.signedPdfUrl
                    ? `${baseUrl}${req.signature.signedPdfUrl}`
                    : null,
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// GET /api/admin/requests/:id - Get detailed request info (protected)
router.get('/requests/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const signRequest = await prisma.signRequest.findUnique({
            where: { id: parseInt(id) },
            include: {
                boss: true,
                signature: true,
            },
        });

        if (!signRequest) {
            return res.status(404).json({ error: 'Sign request not found' });
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        res.json({
            id: signRequest.id,
            staffName: signRequest.staffName,
            bossName: signRequest.boss?.name || signRequest.manualBossName,
            bossPhone: signRequest.boss?.phoneNumber || signRequest.manualBossPhone,
            pdfUrl: `${baseUrl}${signRequest.pdfUrl}`,
            signAreaCoords: signRequest.signAreaCoords,
            status: signRequest.status,
            uniqueLink: signRequest.uniqueLink,
            statusLink: `${baseUrl}/status/${signRequest.uniqueLink}`,
            signLink: `${baseUrl}/sign/${signRequest.uniqueLink}`,
            createdAt: signRequest.createdAt,
            signature: signRequest.signature ? {
                type: signRequest.signature.type,
                signatureUrl: `${baseUrl}${signRequest.signature.signatureUrl}`,
                signedPdfUrl: signRequest.signature.signedPdfUrl
                    ? `${baseUrl}${signRequest.signature.signedPdfUrl}`
                    : null,
                signedAt: signRequest.signature.signedAt,
                rejectionReason: signRequest.signature.rejectionReason,
            } : null,
        });
    } catch (error) {
        console.error('Error fetching request details:', error);
        res.status(500).json({ error: 'Failed to fetch request details' });
    }
});

module.exports = router;
