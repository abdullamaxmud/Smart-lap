import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Search, Calendar, User, MapPin, Monitor, MessageSquare, PlusCircle, Eye, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import ReportDetails from '../components/ReportDetails';
import { StatusBadge, PriorityBadge, PageLoader, EmptyState, Modal, ConfirmDialog } from '../components/ui';
import { STATUSES, errorMessage, formatDate } from '../utils/format';

const MyReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewing, setViewing] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [busy, setBusy] = useState(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/reports', { params: { mine: 'true', limit: 200 } });
            setReports(res.data.data);
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to fetch your reports'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const filteredReports = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return reports.filter((report) => {
            const matchesStatus = !statusFilter || report.status === statusFilter;
            const matchesSearch =
                !q ||
                [report.description, report.computerNumber, report.category, report.lab?.name]
                    .some((v) => v?.toLowerCase().includes(q));
            return matchesStatus && matchesSearch;
        });
    }, [reports, searchQuery, statusFilter]);

    const counts = useMemo(
        () => Object.fromEntries(STATUSES.map((s) => [s, reports.filter((r) => r.status === s).length])),
        [reports]
    );

    const onCancelReport = async () => {
        setBusy(true);
        try {
            await axios.delete(`/api/reports/${cancelling._id}`);
            setReports((prev) => prev.filter((r) => r._id !== cancelling._id));
            toast.success('Report cancelled');
            setCancelling(null);
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to cancel report'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar
                title="My Problem Reports"
                subtitle={`${reports.length} report(s) · ${counts.Pending || 0} pending · ${counts['In Progress'] || 0} in progress · ${counts.Resolved || 0} resolved`}
                actions={
                    <Link to="/report" className="btn-primary hidden sm:inline-flex">
                        <PlusCircle size={18} /> New Report
                    </Link>
                }
            />

            <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="search"
                            placeholder="Search by description, lab, PC..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field pl-10 text-sm"
                        />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-sm sm:w-48">
                        <option value="">All Statuses</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {loading ? (
                    <PageLoader />
                ) : filteredReports.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            icon={<Monitor size={28} />}
                            title="No reports found"
                            message={searchQuery || statusFilter
                                ? 'No reports match your current filters.'
                                : "You haven't reported any problems yet."}
                            action={!searchQuery && !statusFilter && (
                                <Link to="/report" className="btn-primary"><PlusCircle size={18} /> Report a Problem</Link>
                            )}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredReports.map((report) => (
                            <div key={report._id} className="card hover:shadow-md transition-all border-l-4 border-l-hu-blue">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-3 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-3 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                                {report.category}
                                            </span>
                                            <StatusBadge status={report.status} />
                                            <PriorityBadge priority={report.priority} />
                                            <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                                <Calendar size={13} /> {formatDate(report.createdAt)}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                                            <span className="flex items-center gap-1">
                                                <MapPin size={14} className="text-slate-400" />
                                                <span className="font-bold">{report.lab?.name || 'Unknown Lab'}</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Monitor size={14} className="text-slate-400" />
                                                PC <span className="font-semibold text-slate-800">{report.computerNumber}</span>
                                            </span>
                                            {report.assignedTo && (
                                                <span className="flex items-center gap-1">
                                                    <User size={14} className="text-slate-400" />
                                                    {report.assignedTo.name}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-slate-700 text-sm line-clamp-2">{report.description}</p>

                                        {report.resolutionNotes && (
                                            <div className="flex gap-2 text-sm bg-emerald-50/60 border border-emerald-100 rounded-lg p-3">
                                                <MessageSquare size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                                <p className="text-slate-700 line-clamp-2">{report.resolutionNotes}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex md:flex-col gap-2 shrink-0">
                                        <button className="btn-secondary text-sm" onClick={() => setViewing(report)}>
                                            <Eye size={16} /> Details
                                        </button>
                                        {report.status === 'Pending' && (
                                            <button className="btn-secondary text-sm text-red-600 hover:bg-red-50" onClick={() => setCancelling(report)}>
                                                <Trash2 size={16} /> Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal open={!!viewing} onClose={() => setViewing(null)} title="Report Details">
                {viewing && <div className="p-6"><ReportDetails report={viewing} /></div>}
            </Modal>

            <ConfirmDialog
                open={!!cancelling}
                title="Cancel this report?"
                message="The report will be removed permanently. You can only cancel reports that are still pending."
                confirmLabel="Cancel Report"
                busy={busy}
                onConfirm={onCancelReport}
                onCancel={() => setCancelling(null)}
            />
        </div>
    );
};

export default MyReports;
