const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/bosses - Get list of 3 main bosses
router.get('/', async (req, res) => {
    try {
        const bosses = await prisma.boss.findMany({
            select: {
                id: true,
                name: true,
                phoneNumber: true,
            },
            orderBy: {
                id: 'asc',
            },
        });

        res.json(bosses);
    } catch (error) {
        console.error('Error fetching bosses:', error);
        res.status(500).json({ error: 'Failed to fetch bosses' });
    }
});

module.exports = router;
