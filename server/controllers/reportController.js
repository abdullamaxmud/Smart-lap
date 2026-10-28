const mongoose = require('mongoose');
const ProblemReport = require('../models/ProblemReport');
const Lab = require('../models/Lab');
const User = require('../models/User');
const logActivity = require('../utils/logActivity');

const STAFF_ROLES = ['super_admin', 'admin'];
const POPULATE = [
    { path: 'faculty', select: 'name' },
    { path: 'department', select: 'name' },
    { path: 'lab', select: 'name location' },
    { path: 'user', select: 'name email role' },
    { path: 'assignedTo', select: 'name email role' }
];
const SORTABLE = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'status', '-status', 'priority', '-priority'];

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === String(value);
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Which reports the current user is allowed to see at all
const scopeForUser = (user, { mine } = {}) => {
    if (user.role === 'user') return { user: user._id };
    if (user.role === 'technician') {
        if (mine) return { assignedTo: user._id };
        return { $or: [{ assignedTo: user._id }, { assignedTo: null }] };
    }
    return mine ? { user: user._id } : {};
};

const canView = (user, report) => {
    if (STAFF_ROLES.includes(user.role)) return true;
    if (user.role === 'technician') return !report.assignedTo || report.assignedTo.toString() === user.id;
    return report.user.toString() === user.id;
};

// @desc    Create new problem report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res, next) => {
    try {
        const { faculty, department, lab, computerNumber, category, priority, description } = req.body;

        if (!isObjectId(lab)) {
            return res.status(400).json({ success: false, message: 'Please select a valid lab' });
        }

        const labDoc = await Lab.findById(lab);
        if (!labDoc) {
            return res.status(400).json({ success: false, message: 'Selected lab does not exist' });
        }

        if ((faculty && labDoc.faculty.toString() !== String(faculty)) ||
            (department && labDoc.department.toString() !== String(department))) {
            return res.status(400).json({
                success: false,
                message: 'Selected lab does not belong to the selected faculty and department'
            });
        }

        const report = await ProblemReport.create({
            user: req.user._id,
            faculty: labDoc.faculty,
            department: labDoc.department,
            lab: labDoc._id,
            computerNumber,
            category,
            priority,
            description
        });

        await logActivity(
            req,
            req.user._id,
            'CREATED_REPORT',
            `Reported ${category} issue in ${labDoc.name}, computer ${computerNumber}`
        );

        const populated = await ProblemReport.findById(report._id).populate(POPULATE);
        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        next(err);
    }
};

// @desc    Get reports (role-scoped, with filters, search and pagination)
// @route   GET /api/reports
// @access  Private
exports.getReports = async (req, res, next) => {
    try {
        const { status, category, priority, lab, faculty, department, assignedTo, q, sort } = req.query;
        const mine = req.query.mine === 'true';

        const filters = [scopeForUser(req.user, { mine })];

        // Only whitelisted, type-checked filters reach the database
        if (status && ProblemReport.STATUSES.includes(status)) filters.push({ status });
        if (category && ProblemReport.CATEGORIES.includes(category)) filters.push({ category });
        if (priority && ProblemReport.PRIORITIES.includes(priority)) filters.push({ priority });
        if (lab && isObjectId(lab)) filters.push({ lab });
        if (faculty && isObjectId(faculty)) filters.push({ faculty });
        if (department && isObjectId(department)) filters.push({ department });
        if (assignedTo === 'unassigned') filters.push({ assignedTo: null });
        else if (assignedTo && isObjectId(assignedTo)) filters.push({ assignedTo });

        if (q && String(q).trim()) {
            const regex = new RegExp(escapeRegex(String(q).trim()), 'i');
            const matchingLabs = await Lab.find({ name: regex }).select('_id');
            filters.push({
                $or: [
                    { computerNumber: regex },
                    { description: regex },
                    { lab: { $in: matchingLabs.map(l => l._id) } }
                ]
            });
        }

        const query = { $and: filters };

        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const sortBy = SORTABLE.includes(sort) ? sort : '-createdAt';

        const [reports, total] = await Promise.all([
            ProblemReport.find(query)
                .populate(POPULATE)
                .sort(sortBy)
                .skip((page - 1) * limit)
                .limit(limit),
            ProblemReport.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            count: reports.length,
            total,
            page,
            pages: Math.max(Math.ceil(total / limit), 1),
            data: reports
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single report
// @route   GET /api/reports/:id
// @access  Private
exports.getReport = async (req, res, next) => {
    try {
        const report = await ProblemReport.findById(req.params.id);

        if (!report || !canView(req.user, report)) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        await report.populate(POPULATE);
        res.status(200).json({ success: true, data: report });
    } catch (err) {
        next(err);
    }
};

// @desc    Update report (Assign, Status, Notes)
// @route   PUT /api/reports/:id
// @access  Private (Super Admin/Admin/Technician)
exports.updateReport = async (req, res, next) => {
    try {
        const report = await ProblemReport.findById(req.params.id);

        if (!report || !canView(req.user, report)) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        const isStaff = STAFF_ROLES.includes(req.user.role);
        const { status, priority, adminNotes, resolutionNotes } = req.body;
        const changes = [];

        if (req.body.assignedTo !== undefined) {
            const target = req.body.assignedTo || null;

            if (!isStaff && target && target !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Technicians can only assign reports to themselves'
                });
            }

            if (target) {
                if (!isObjectId(target)) {
                    return res.status(400).json({ success: false, message: 'Invalid assignee' });
                }
                const assignee = await User.findById(target);
                if (!assignee || !assignee.isActive || !['technician', 'admin', 'super_admin'].includes(assignee.role)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Reports can only be assigned to an active technician or admin'
                    });
                }
                if (String(report.assignedTo) !== String(assignee._id)) {
                    changes.push(`assigned to ${assignee.name}`);
                }
            } else if (report.assignedTo) {
                if (!isStaff) {
                    return res.status(403).json({ success: false, message: 'Only admins can unassign reports' });
                }
                changes.push('unassigned');
            }

            report.assignedTo = target || undefined;
        }

        // A technician picking up an unassigned report takes ownership of it
        if (!isStaff && !report.assignedTo) {
            report.assignedTo = req.user._id;
            changes.push(`assigned to ${req.user.name}`);
        }

        if (status !== undefined && status !== report.status) {
            if (!ProblemReport.STATUSES.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }
            changes.push(`status ${report.status} → ${status}`);
            report.status = status;
            report.resolvedAt = status === 'Resolved' ? new Date() : undefined;
        }

        if (priority !== undefined && priority !== report.priority) {
            if (!isStaff) {
                return res.status(403).json({ success: false, message: 'Only admins can change priority' });
            }
            changes.push(`priority → ${priority}`);
            report.priority = priority;
        }

        if (adminNotes !== undefined) report.adminNotes = adminNotes;
        if (resolutionNotes !== undefined) report.resolutionNotes = resolutionNotes;

        await report.save();

        await logActivity(
            req,
            req.user._id,
            'UPDATED_REPORT',
            `Updated report for computer ${report.computerNumber}${changes.length ? `: ${changes.join(', ')}` : ' (notes)'}`
        );

        await report.populate(POPULATE);
        res.status(200).json({ success: true, data: report });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete report (staff: any report; reporter: own pending report)
// @route   DELETE /api/reports/:id
// @access  Private
exports.deleteReport = async (req, res, next) => {
    try {
        const report = await ProblemReport.findById(req.params.id).populate('lab', 'name');

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        const isStaff = STAFF_ROLES.includes(req.user.role);
        const isOwnPending = report.user.toString() === req.user.id && report.status === 'Pending';

        if (!isStaff && !isOwnPending) {
            return res.status(403).json({
                success: false,
                message: 'You can only cancel your own reports while they are still pending'
            });
        }

        await report.deleteOne();

        await logActivity(
            req,
            req.user._id,
            'DELETED_REPORT',
            `Deleted report for ${report.lab?.name || 'unknown lab'}, computer ${report.computerNumber}`
        );

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// @desc    Get dashboard stats (scoped to what the user can see)
// @route   GET /api/reports/stats
// @access  Private
exports.getStats = async (req, res, next) => {
    try {
        const scope = req.user.role === 'technician'
            ? { assignedTo: req.user._id }
            : scopeForUser(req.user);

        const since = new Date();
        since.setHours(0, 0, 0, 0);
        since.setDate(since.getDate() - 29);

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [
            statusAgg,
            categoryAgg,
            labAgg,
            dailyAgg,
            resolutionAgg,
            unassignedIssues,
            resolvedThisWeek,
            createdThisWeek
        ] = await Promise.all([
            ProblemReport.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
            ProblemReport.aggregate([
                { $match: scope },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            ProblemReport.aggregate([
                { $match: scope },
                { $group: { _id: '$lab', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'labs', localField: '_id', foreignField: '_id', as: 'lab' } },
                { $project: { count: 1, name: { $ifNull: [{ $arrayElemAt: ['$lab.name', 0] }, 'Deleted lab'] } } }
            ]),
            ProblemReport.aggregate([
                { $match: { ...scope, createdAt: { $gte: since } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                }
            ]),
            ProblemReport.aggregate([
                { $match: { ...scope, status: 'Resolved', resolvedAt: { $ne: null } } },
                { $group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } } } }
            ]),
            STAFF_ROLES.includes(req.user.role)
                ? ProblemReport.countDocuments({ assignedTo: null, status: { $ne: 'Resolved' } })
                : Promise.resolve(null),
            ProblemReport.countDocuments({ ...scope, status: 'Resolved', resolvedAt: { $gte: weekAgo } }),
            ProblemReport.countDocuments({ ...scope, createdAt: { $gte: weekAgo } })
        ]);

        const byStatus = Object.fromEntries(statusAgg.map(s => [s._id, s.count]));
        const pendingIssues = byStatus['Pending'] || 0;
        const inProgressIssues = byStatus['In Progress'] || 0;
        const resolvedIssues = byStatus['Resolved'] || 0;

        // Fill missing days with zero so the trend chart has a continuous axis
        const dailyMap = Object.fromEntries(dailyAgg.map(d => [d._id, d.count]));
        const dailyStats = [];
        for (let i = 0; i < 30; i++) {
            const day = new Date(since);
            day.setDate(since.getDate() + i);
            const key = day.toISOString().slice(0, 10);
            dailyStats.push({ date: key, count: dailyMap[key] || 0 });
        }

        const avgMs = resolutionAgg[0]?.avgMs;

        res.status(200).json({
            success: true,
            data: {
                totalIssues: pendingIssues + inProgressIssues + resolvedIssues,
                pendingIssues,
                inProgressIssues,
                resolvedIssues,
                unassignedIssues,
                resolvedThisWeek,
                createdThisWeek,
                avgResolutionHours: avgMs ? Math.round((avgMs / 36e5) * 10) / 10 : null,
                statusDistribution: statusAgg,
                categoryDistribution: categoryAgg.map(c => ({ name: c._id, count: c.count })),
                topLabs: labAgg.map(l => ({ name: l.name, count: l.count })),
                dailyStats
            }
        });
    } catch (err) {
        next(err);
    }
};
