const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Lab = require('../models/Lab');
const ProblemReport = require('../models/ProblemReport');
const ActivityLog = require('../models/ActivityLog');
const logActivity = require('../utils/logActivity');

const USER_POPULATE = { path: 'faculty department', select: 'name' };

const notFound = (res, what) => res.status(404).json({ success: false, message: `${what} not found` });

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Super Admin)
exports.getUsers = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.role && User.ROLES.includes(req.query.role)) filter.role = req.query.role;

        const users = await User.find(filter).populate(USER_POPULATE).sort('-createdAt');
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        next(err);
    }
};

// @desc    Get active staff who can be assigned to reports
// @route   GET /api/admin/assignees
// @access  Private (Super Admin/Admin)
exports.getAssignees = async (req, res, next) => {
    try {
        const users = await User.find({
            role: { $in: ['technician', 'admin', 'super_admin'] },
            isActive: true
        }).select('name email role').sort('role name');
        res.status(200).json({ success: true, data: users });
    } catch (err) {
        next(err);
    }
};

// @desc    Create user
// @route   POST /api/admin/users
// @access  Private (Super Admin)
exports.createUser = async (req, res, next) => {
    try {
        const { name, email, password, role, faculty, department } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        if (role && !User.ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'user',
            faculty: faculty || undefined,
            department: department || undefined
        });

        await logActivity(req, req.user._id, 'CREATED_USER', `Created ${user.role} account ${user.email}`);

        const populatedUser = await User.findById(user._id).populate(USER_POPULATE);
        res.status(201).json({ success: true, data: populatedUser });
    } catch (err) {
        next(err);
    }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Super Admin)
exports.updateUser = async (req, res, next) => {
    try {
        const { name, role, faculty, department, isActive } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) return notFound(res, 'User');

        const isSelf = req.user.id === user.id;

        if (user.role === 'super_admin' && !isSelf) {
            return res.status(403).json({
                success: false,
                message: 'You cannot modify another super admin account'
            });
        }

        // Prevent a super admin from locking themselves out
        if (isSelf && role !== undefined && role !== user.role) {
            return res.status(400).json({ success: false, message: 'You cannot change your own role' });
        }
        if (isSelf && isActive === false) {
            return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
        }

        if (role !== undefined && !User.ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        if (name !== undefined) user.name = name;
        if (role !== undefined) user.role = role;
        if (faculty !== undefined) user.faculty = faculty || undefined;
        if (department !== undefined) user.department = department || undefined;
        if (typeof isActive === 'boolean') user.isActive = isActive;

        await user.save();
        await logActivity(req, req.user._id, 'UPDATED_USER', `Updated account ${user.email} (role: ${user.role}, ${user.isActive ? 'active' : 'inactive'})`);

        const updatedUser = await User.findById(user._id).populate(USER_POPULATE);
        res.status(200).json({ success: true, data: updatedUser });
    } catch (err) {
        next(err);
    }
};

// @desc    Reset user password
// @route   PATCH /api/admin/users/:id/reset-password
// @access  Private (Super Admin)
exports.resetUserPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        if (!password || String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password is required and must be at least 6 characters'
            });
        }

        const user = await User.findById(req.params.id).select('+password');
        if (!user) return notFound(res, 'User');

        if (user.role === 'super_admin' && req.user.id !== user.id) {
            return res.status(403).json({
                success: false,
                message: 'You cannot reset another super admin password'
            });
        }

        user.password = password;
        await user.save();
        await logActivity(req, req.user._id, 'RESET_PASSWORD', `Reset password for ${user.email}`);

        res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete user (only accounts without report history)
// @route   DELETE /api/admin/users/:id
// @access  Private (Super Admin)
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return notFound(res, 'User');

        if (req.user.id === user.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }
        if (user.role === 'super_admin') {
            return res.status(403).json({ success: false, message: 'Super admin accounts cannot be deleted' });
        }

        const reportCount = await ProblemReport.countDocuments({
            $or: [{ user: user._id }, { assignedTo: user._id }]
        });
        if (reportCount > 0) {
            return res.status(400).json({
                success: false,
                message: `This user is linked to ${reportCount} report(s). Deactivate the account instead.`
            });
        }

        await user.deleteOne();
        await logActivity(req, req.user._id, 'DELETED_USER', `Deleted account ${user.email}`);

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// Faculties
// ---------------------------------------------------------------------------

// @desc    Get faculties
// @route   GET /api/admin/faculties
// @access  Public
exports.getFaculties = async (req, res, next) => {
    try {
        const faculties = await Faculty.find().sort('name');
        res.status(200).json({ success: true, data: faculties });
    } catch (err) {
        next(err);
    }
};

// @desc    Create faculty
// @route   POST /api/admin/faculties
// @access  Private (Super Admin)
exports.createFaculty = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const faculty = await Faculty.create({ name, description });
        await logActivity(req, req.user._id, 'CREATED_FACULTY', `Created faculty ${faculty.name}`);
        res.status(201).json({ success: true, data: faculty });
    } catch (err) {
        next(err);
    }
};

// @desc    Update faculty
// @route   PUT /api/admin/faculties/:id
// @access  Private (Super Admin)
exports.updateFaculty = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const faculty = await Faculty.findById(req.params.id);
        if (!faculty) return notFound(res, 'Faculty');

        if (name !== undefined) faculty.name = name;
        if (description !== undefined) faculty.description = description;
        await faculty.save();

        await logActivity(req, req.user._id, 'UPDATED_FACULTY', `Updated faculty ${faculty.name}`);
        res.status(200).json({ success: true, data: faculty });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete faculty (must have no departments)
// @route   DELETE /api/admin/faculties/:id
// @access  Private (Super Admin)
exports.deleteFaculty = async (req, res, next) => {
    try {
        const faculty = await Faculty.findById(req.params.id);
        if (!faculty) return notFound(res, 'Faculty');

        const deptCount = await Department.countDocuments({ faculty: faculty._id });
        if (deptCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Remove the ${deptCount} department(s) in this faculty first`
            });
        }

        await faculty.deleteOne();
        await logActivity(req, req.user._id, 'DELETED_FACULTY', `Deleted faculty ${faculty.name}`);
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

// @desc    Get departments
// @route   GET /api/admin/departments
// @access  Public
exports.getDepartments = async (req, res, next) => {
    try {
        const filter = req.query.faculty ? { faculty: String(req.query.faculty) } : {};
        const departments = await Department.find(filter).populate('faculty', 'name').sort('name');
        res.status(200).json({ success: true, data: departments });
    } catch (err) {
        next(err);
    }
};

// @desc    Create department
// @route   POST /api/admin/departments
// @access  Private (Super Admin)
exports.createDepartment = async (req, res, next) => {
    try {
        const { name, faculty } = req.body;
        if (!faculty || !(await Faculty.exists({ _id: faculty }))) {
            return res.status(400).json({ success: false, message: 'Please select a valid faculty' });
        }

        const department = await Department.create({ name, faculty });
        await logActivity(req, req.user._id, 'CREATED_DEPARTMENT', `Created department ${department.name}`);

        await department.populate('faculty', 'name');
        res.status(201).json({ success: true, data: department });
    } catch (err) {
        next(err);
    }
};

// @desc    Update department
// @route   PUT /api/admin/departments/:id
// @access  Private (Super Admin)
exports.updateDepartment = async (req, res, next) => {
    try {
        const { name, faculty } = req.body;
        const department = await Department.findById(req.params.id);
        if (!department) return notFound(res, 'Department');

        if (faculty !== undefined && String(faculty) !== department.faculty.toString()) {
            if (!(await Faculty.exists({ _id: faculty }))) {
                return res.status(400).json({ success: false, message: 'Please select a valid faculty' });
            }
            const labCount = await Lab.countDocuments({ department: department._id });
            if (labCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'This department has labs; move or remove them before changing its faculty'
                });
            }
            department.faculty = faculty;
        }
        if (name !== undefined) department.name = name;

        await department.save();
        await logActivity(req, req.user._id, 'UPDATED_DEPARTMENT', `Updated department ${department.name}`);

        await department.populate('faculty', 'name');
        res.status(200).json({ success: true, data: department });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete department (must have no labs)
// @route   DELETE /api/admin/departments/:id
// @access  Private (Super Admin)
exports.deleteDepartment = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) return notFound(res, 'Department');

        const labCount = await Lab.countDocuments({ department: department._id });
        if (labCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Remove the ${labCount} lab(s) in this department first`
            });
        }

        await department.deleteOne();
        await User.updateMany({ department: department._id }, { $unset: { department: 1 } });
        await logActivity(req, req.user._id, 'DELETED_DEPARTMENT', `Deleted department ${department.name}`);
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// Labs
// ---------------------------------------------------------------------------

const validateLabParents = async (faculty, department) => {
    const dept = department ? await Department.findById(department) : null;
    if (!dept) return 'Please select a valid department';
    if (dept.faculty.toString() !== String(faculty)) return 'The department does not belong to the selected faculty';
    return null;
};

// @desc    Get labs
// @route   GET /api/admin/labs
// @access  Public
exports.getLabs = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.faculty) filter.faculty = String(req.query.faculty);
        if (req.query.department) filter.department = String(req.query.department);

        const labs = await Lab.find(filter).populate('faculty department', 'name').sort('name');
        res.status(200).json({ success: true, data: labs });
    } catch (err) {
        next(err);
    }
};

// @desc    Create lab
// @route   POST /api/admin/labs
// @access  Private (Super Admin)
exports.createLab = async (req, res, next) => {
    try {
        const { name, faculty, department, location, capacity } = req.body;

        const problem = await validateLabParents(faculty, department);
        if (problem) return res.status(400).json({ success: false, message: problem });

        const lab = await Lab.create({
            name,
            faculty,
            department,
            location,
            capacity: capacity === '' || capacity === undefined ? undefined : capacity
        });
        await logActivity(req, req.user._id, 'CREATED_LAB', `Created lab ${lab.name}`);

        await lab.populate('faculty department', 'name');
        res.status(201).json({ success: true, data: lab });
    } catch (err) {
        next(err);
    }
};

// @desc    Update lab
// @route   PUT /api/admin/labs/:id
// @access  Private (Super Admin)
exports.updateLab = async (req, res, next) => {
    try {
        const { name, faculty, department, location, capacity } = req.body;
        const lab = await Lab.findById(req.params.id);
        if (!lab) return notFound(res, 'Lab');

        const nextFaculty = faculty !== undefined ? faculty : lab.faculty.toString();
        const nextDepartment = department !== undefined ? department : lab.department.toString();
        const problem = await validateLabParents(nextFaculty, nextDepartment);
        if (problem) return res.status(400).json({ success: false, message: problem });

        if (name !== undefined) lab.name = name;
        if (location !== undefined) lab.location = location;
        if (capacity !== undefined) lab.capacity = capacity === '' || capacity === null ? undefined : capacity;
        lab.faculty = nextFaculty;
        lab.department = nextDepartment;

        await lab.save();
        await logActivity(req, req.user._id, 'UPDATED_LAB', `Updated lab ${lab.name}`);

        await lab.populate('faculty department', 'name');
        res.status(200).json({ success: true, data: lab });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete lab (must have no reports)
// @route   DELETE /api/admin/labs/:id
// @access  Private (Super Admin)
exports.deleteLab = async (req, res, next) => {
    try {
        const lab = await Lab.findById(req.params.id);
        if (!lab) return notFound(res, 'Lab');

        const reportCount = await ProblemReport.countDocuments({ lab: lab._id });
        if (reportCount > 0) {
            return res.status(400).json({
                success: false,
                message: `This lab has ${reportCount} report(s) and cannot be deleted`
            });
        }

        await lab.deleteOne();
        await logActivity(req, req.user._id, 'DELETED_LAB', `Deleted lab ${lab.name}`);
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// Activity logs
// ---------------------------------------------------------------------------

// @desc    Get activity logs
// @route   GET /api/admin/logs
// @access  Private (Super Admin)
exports.getActivityLogs = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.action) filter.action = String(req.query.action);

        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 1000);

        const [logs, actions] = await Promise.all([
            ActivityLog.find(filter)
                .populate('user', 'name email role')
                .sort('-createdAt')
                .limit(limit),
            ActivityLog.distinct('action')
        ]);
        res.status(200).json({ success: true, count: logs.length, actions: actions.sort(), data: logs });
    } catch (err) {
        next(err);
    }
};
