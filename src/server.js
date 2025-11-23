const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const signRequestRoutes = require('./routes/signRequest');
const signatureRoutes = require('./routes/signature');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure storage directories exist
const storagePath = process.env.STORAGE_PATH || path.join(__dirname, '../storage');
const pdfPath = path.join(storagePath, 'pdfs');
const signaturePath = path.join(storagePath, 'signatures');

[storagePath, pdfPath, signaturePath].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Static file serving for uploaded files
app.use('/storage', express.static(storagePath));

// API Routes
app.use('/api/sign-requests', signRequestRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bosses', require('./routes/boss'));

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../client/dist');
    app.use(express.static(frontendPath));

    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'TapSign API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 TapSign server running on port ${PORT}`);
    console.log(`📁 Storage path: ${storagePath}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
