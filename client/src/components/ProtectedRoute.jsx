import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { Spinner } from './ui';

const LayoutContext = createContext({ openSidebar: () => {} });
export const useLayout = () => useContext(LayoutContext);

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Close the mobile drawer after navigating
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <Spinner className="h-12 w-12" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <LayoutContext.Provider value={{ openSidebar: () => setSidebarOpen(true) }}>
            <div className="min-h-screen bg-slate-50">
                <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <main className="lg:ml-64 min-w-0">
                    <Outlet />
                </main>
            </div>
        </LayoutContext.Provider>
    );
};

export default ProtectedRoute;
