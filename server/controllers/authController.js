const User = require('../models/User');
const Department = require('../models/Department');
const jwt = require('jsonwebtoken');
const logActivity = require('../utils/logActivity');

const TOKEN_TTL_DAYS = 30;

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, faculty, department } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email: String(email).toLowerCase().trim() });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists'
            });
        }

        if (department) {
            const dept = await Department.findById(department);
            if (!dept || (faculty && dept.faculty.toString() !== String(faculty))) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected department does not belong to the selected faculty'
                });
            }
        }

        // Self-registration always creates a regular user; roles are granted by a super admin
        const user = await User.create({
            name,
            email,
            password,
            role: 'user',
            faculty: faculty || undefined,
            department: department || undefined
        });

        await logActivity(req, user._id, 'REGISTER', `New account registered: ${user.email}`);

        await sendTokenResponse(user, 201, res);
    } catch (err) {
        next(err);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an email and password'
            });
        }

        // Check for user
        const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');

        if (!user || !(await user.matchPassword(String(password)))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account is inactive. Contact an administrator.'
            });
        }

        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        await logActivity(req, user._id, 'LOGIN', `${user.email} signed in`);

        await sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
    try {
        await logActivity(req, req.user._id, 'LOGOUT', `${req.user.email} signed out`);
        res.cookie('token', '', { expires: new Date(0), httpOnly: true });
        res.status(200).json({ success: true, message: 'Logged out' });
    } catch (err) {
        next(err);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate('faculty department', 'name');
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update current user profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateMe = async (req, res, next) => {
    try {
        const { name, faculty, department } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (name !== undefined) user.name = name;
        if (faculty !== undefined) user.faculty = faculty || undefined;
        if (department !== undefined) user.department = department || undefined;

        await user.save();
        await logActivity(req, user._id, 'UPDATED_PROFILE', `${user.email} updated their profile`);

        const updatedUser = await User.findById(user._id).populate('faculty department', 'name');
        res.status(200).json({ success: true, data: updatedUser });
    } catch (err) {
        next(err);
    }
};

// @desc    Change current user password
// @route   PATCH /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (String(newPassword).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await user.matchPassword(String(currentPassword));
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();
        await logActivity(req, user._id, 'CHANGED_PASSWORD', `${user.email} changed their password`);

        res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
};

// Get token from model, create cookie and send response
const sendTokenResponse = async (user, statusCode, res) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: `${TOKEN_TTL_DAYS}d`
    });

    const options = {
        expires: new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: 'lax'
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    const profile = await User.findById(user._id).populate('faculty department', 'name');

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token,
        user: profile
    });
};
