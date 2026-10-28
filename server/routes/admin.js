const express = require('express');
const {
    getUsers,
    getAssignees,
    createUser,
    updateUser,
    resetUserPassword,
    deleteUser,
    getFaculties,
    createFaculty,
    updateFaculty,
    deleteFaculty,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getLabs,
    createLab,
    updateLab,
    deleteLab,
    getActivityLogs
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Publicly readable (needed by the registration form) but protected for modification
router.get('/faculties', getFaculties);
router.get('/departments', getDepartments);
router.get('/labs', getLabs);

router.use(protect);
router.use(authorize('super_admin', 'admin'));

router.get('/assignees', getAssignees);

// Everything below is super admin only
router.use(authorize('super_admin'));

router.route('/users').get(getUsers).post(createUser);
router.route('/users/:id').put(updateUser).delete(deleteUser);
router.patch('/users/:id/reset-password', resetUserPassword);

router.post('/faculties', createFaculty);
router.route('/faculties/:id').put(updateFaculty).delete(deleteFaculty);

router.post('/departments', createDepartment);
router.route('/departments/:id').put(updateDepartment).delete(deleteDepartment);

router.post('/labs', createLab);
router.route('/labs/:id').put(updateLab).delete(deleteLab);

router.get('/logs', getActivityLogs);

module.exports = router;
