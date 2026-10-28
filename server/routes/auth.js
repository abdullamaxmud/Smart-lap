const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, logout, getMe, updateMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Slow down brute-force attempts on the public auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.patch('/change-password', protect, changePassword);

module.exports = router;
