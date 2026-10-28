require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');

['MONGODB_URI', 'JWT_SECRET'].forEach((key) => {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
});

const app = express();

// Behind a reverse proxy (nginx, Render, etc.) this gives the real client IP for logs/rate limiting
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(cors({
    origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim()),
    credentials: true
}));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: Math.round(process.uptime())
    });
});

// Mount routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));

// Unknown API routes
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// In production, serve the built React app from the same origin
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
    await connectDB();
    const server = app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
        console.error(`Unhandled rejection: ${err.message}`);
        server.close(() => process.exit(1));
    });
};

start();
