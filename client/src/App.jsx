import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportProblem from './pages/ReportProblem';
import ManageIssues from './pages/ManageIssues';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import LabConfiguration from './pages/LabConfiguration';
import ProtectedRoute from './components/ProtectedRoute';
import MyReports from './pages/MyReports';
import ActivityLogs from './pages/ActivityLogs';
import NotFound from './pages/NotFound';

function App() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'technician', 'user']} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Admin/User Routes */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'user']} />}>
                <Route path="/report" element={<ReportProblem />} />
                <Route path="/my-reports" element={<MyReports />} />
            </Route>

            {/* Admin/Technician Routes */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'technician']} />}>
                <Route path="/manage-issues" element={<ManageIssues />} />
            </Route>

            {/* Super Admin Only */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route path="/users" element={<UserManagement />} />
                <Route path="/lab-config" element={<LabConfiguration />} />
                <Route path="/activity-logs" element={<ActivityLogs />} />
            </Route>

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;
