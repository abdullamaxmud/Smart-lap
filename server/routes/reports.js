const express = require('express');
const {
    createReport,
    getReports,
    getReport,
    updateReport,
    deleteReport,
    getStats
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getReports)
    .post(createReport);

router.get('/stats', getStats);

router.route('/:id')
    .get(getReport)
    .put(authorize('super_admin', 'admin', 'technician'), updateReport)
    .delete(deleteReport);

module.exports = router;
