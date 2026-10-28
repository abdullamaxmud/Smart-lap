import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Search, Calendar, History, RefreshCw, SlidersHorizontal, Shield, Globe } from 'lucide-react';
import Navbar from '../components/Navbar';
import { PageLoader, EmptyState, RoleBadge } from '../components/ui';
import { errorMessage, formatAction, formatDate } from '../utils/format';

const getActionBadgeClass = (action = '') => {
    if (action.startsWith('CREATED') || action === 'REGISTER') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.startsWith('UPDATED') || action.startsWith('CHANGED')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (action.startsWith('DELETED')) return 'bg-red-50 text-red-700 border-red-200';
    if (action === 'LOGIN' || action === 'LOGOUT') return 'bg-violet-50 text-violet-700 border-violet-200';
    if (action === 'RESET_PASSWORD') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
};

const ActivityLogs = () => {
    const [logs, setLogs] = useState([]);
    const [actionTypes, setActionTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/logs', { params: { limit: 500, ...(actionFilter ? { action: actionFilter } : {}) } });
            setLogs(res.data.data);
            setActionTypes(res.data.actions || []);
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to fetch activity logs'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actionFilter]);

    const filteredLogs = useMemo(() => {
        const q = searchQuery.toLowerCase();
        if (!q) return logs;
        return logs.filter((log) => {
            const haystack = [log.user?.name, log.user?.email, log.user?.role, log.details, log.action, log.ipAddress]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [logs, searchQuery]);

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar title="Activity Logs" subtitle="Audit trail of sign-ins and changes across the system" />

            <div className="p-4 sm:p-8 space-y-6">
                <div className="card p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="search"
                            placeholder="Search by user, email, details, IP..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field pl-9 text-sm"
                        />
                    </div>
                    <div className="relative md:w-60">
                        <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input-field pl-9 text-sm">
                            <option value="">All Actions</option>
                            {actionTypes.map((act) => <option key={act} value={act}>{formatAction(act)}</option>)}
                        </select>
                    </div>
                    <button onClick={fetchLogs} disabled={loading} className="btn-secondary text-sm">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                <div className="card p-0 overflow-hidden">
                    {loading && logs.length === 0 ? (
                        <PageLoader />
                    ) : filteredLogs.length === 0 ? (
                        <EmptyState icon={<History size={28} />} title="No logs found" message="No activity matched your search or filter." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        <th className="table-head">User</th>
                                        <th className="table-head">Action</th>
                                        <th className="table-head">Details</th>
                                        <th className="table-head">IP Address</th>
                                        <th className="table-head text-right">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLogs.map((log) => (
                                        <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="table-cell">
                                                {log.user ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-hu-blue/5 flex items-center justify-center text-hu-blue font-bold text-sm shrink-0">
                                                            {log.user.name?.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 truncate">{log.user.name}</p>
                                                            <p className="text-xs text-slate-400 truncate">{log.user.email}</p>
                                                            <div className="mt-1"><RoleBadge role={log.user.role} /></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                                            <Shield size={14} />
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-500">Deleted user</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="table-cell whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getActionBadgeClass(log.action)}`}>
                                                    {formatAction(log.action)}
                                                </span>
                                            </td>
                                            <td className="table-cell max-w-md">
                                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{log.details}</p>
                                            </td>
                                            <td className="table-cell whitespace-nowrap">
                                                {log.ipAddress ? (
                                                    <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                        <Globe size={13} className="text-slate-400" /> {log.ipAddress.replace(/^::ffff:/, '')}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">-</span>
                                                )}
                                            </td>
                                            <td className="table-cell whitespace-nowrap text-right text-xs font-medium text-slate-500">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Calendar size={13} className="text-slate-400" /> {formatDate(log.createdAt, true)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {logs.length > 0 && (
                    <p className="text-xs text-slate-400 text-center">Showing the most recent {logs.length} entries.</p>
                )}
            </div>
        </div>
    );
};

export default ActivityLogs;
