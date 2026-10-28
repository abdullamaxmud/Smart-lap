import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, ChevronDown, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from './ProtectedRoute';
import { formatRole } from '../utils/format';

const Navbar = ({ title, subtitle, actions }) => {
    const { user, logout } = useAuth();
    const { openSidebar } = useLayout();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        document.title = title ? `${title} · HU Smart Lab` : 'HU Smart Lab MS';
    }, [title]);

    useEffect(() => {
        const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    return (
        <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-8">
            <div className="flex items-center gap-3 min-w-0">
                <button onClick={openSidebar} className="btn-icon lg:hidden -ml-2" aria-label="Open menu">
                    <Menu size={22} />
                </button>
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 heading-font truncate">{title}</h2>
                    {subtitle && <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {actions}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="flex items-center gap-2 hover:bg-slate-50 p-1 pr-2 rounded-lg transition-all"
                    >
                        <div className="w-8 h-8 rounded-full bg-hu-blue text-white flex items-center justify-center text-sm font-bold">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-[10rem] truncate">{user?.name}</span>
                        <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                            <div className="px-4 py-2 border-b border-slate-100">
                                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{formatRole(user?.role)}</p>
                            </div>
                            <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <Settings size={16} /> Settings
                            </Link>
                            <button onClick={logout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
