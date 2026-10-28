import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    ClipboardList,
    Users,
    Settings,
    LogOut,
    PlusCircle,
    Monitor,
    History,
    X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatRole } from '../utils/format';

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['super_admin', 'admin', 'technician', 'user'] },
    { name: 'Report Problem', icon: PlusCircle, path: '/report', roles: ['user', 'super_admin', 'admin'] },
    { name: 'My Reports', icon: FileText, path: '/my-reports', roles: ['user', 'admin', 'super_admin'] },
    { name: 'Manage Issues', icon: ClipboardList, path: '/manage-issues', roles: ['super_admin', 'admin', 'technician'] },
    { name: 'User Management', icon: Users, path: '/users', roles: ['super_admin'] },
    { name: 'Lab Config', icon: Monitor, path: '/lab-config', roles: ['super_admin'] },
    { name: 'Activity Logs', icon: History, path: '/activity-logs', roles: ['super_admin'] },
    { name: 'Settings', icon: Settings, path: '/settings', roles: ['super_admin', 'admin', 'technician', 'user'] }
];

const Sidebar = ({ open, onClose }) => {
    const { user, logout } = useAuth();
    const filteredMenu = menuItems.filter((item) => item.roles.includes(user?.role));

    return (
        <>
            {/* Mobile backdrop */}
            <div
                className={`fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            <aside
                className={`w-64 bg-hu-blue text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-50 transition-transform duration-200
                    ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                <div className="p-6 border-b border-white/10 flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold heading-font flex items-center gap-2">
                            <Monitor className="text-hu-gold" />
                            HU Smart Lab
                        </h1>
                        <p className="text-xs text-slate-300 mt-1">Hormuud University</p>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-1 text-slate-300 hover:text-white" aria-label="Close menu">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {filteredMenu.map(({ name, icon: Icon, path }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all border-l-4
                                ${isActive
                                    ? 'bg-white/10 text-white shadow-md border-l-hu-gold'
                                    : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-transparent'}
                            `}
                        >
                            <Icon size={20} />
                            <span className="font-medium">{name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-black/20 rounded-lg">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-hu-gold text-slate-950 flex items-center justify-center font-black">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate text-white">{user?.name}</p>
                            <p className="text-xs text-slate-400">{formatRole(user?.role)}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-slate-300 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
