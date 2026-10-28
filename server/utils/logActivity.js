const ActivityLog = require('../models/ActivityLog');

// Activity logging must never break the request that triggered it
const logActivity = async (req, userId, action, details) => {
    try {
        await ActivityLog.create({
            user: userId,
            action,
            details,
            ipAddress: req.ip
        });
    } catch (err) {
        console.error(`Failed to write activity log (${action}): ${err.message}`);
    }
};

module.exports = logActivity;
