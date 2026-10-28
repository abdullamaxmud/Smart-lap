// Responses always carry `message` (what the client reads) and `error` (kept for compatibility)
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    let message = err.message || 'Server Error';

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        statusCode = 404;
        message = 'Resource not found';
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue || {})[0];
        message = field ? `A record with this ${field} already exists` : 'Duplicate field value entered';
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(val => val.message).join(', ');
    }

    // Malformed JSON body
    if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Invalid JSON in request body';
    }

    if (statusCode >= 500) {
        console.error(err);
        if (process.env.NODE_ENV === 'production') {
            message = 'Server Error';
        }
    }

    res.status(statusCode).json({
        success: false,
        message,
        error: message
    });
};

module.exports = errorHandler;
