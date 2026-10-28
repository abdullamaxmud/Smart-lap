import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, ClipboardList, UserCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import ReportDetails from '../components/ReportDetails';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, PageLoader, EmptyState, Modal, ConfirmDialog, Field } from '../components/ui';
import { STATUSES, CATEGORIES, PRIORITIES, errorMessage, formatRole, timeAgo } from '../utils/format';

const PAGE_SIZE = 15;

const ManageIssues = () => {
    const { user } = useAuth();
    const isStaff = ['super_admin', 'admin'].includes(user?.role);

    const [reports, setReports] = useState([]);
    const [meta, setMeta] = useState({ total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', category: '', priority: '', assignedTo: '' });
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [assignees, setAssignees] = useState([]);

    const [selectedReport, setSelectedReport] = useState(null);
    const [form, setForm] = useState({ status: '', priority: '', assignedTo: '', adminNotes: '', resolutionNotes: '' });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: PAGE_SIZE };
            Object.entries(filter).forEach(([k, v]) => v && (params[k] = v));
            if (debouncedSearch) params.q = debouncedSearch;
            const res = await axios.get('/api/reports', { params });
            setReports(res.data.data);
            setMeta({ total: res.data.total, pages: res.data.pages });
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to fetch reports'));
        } finally {
            setLoading(false);
        }
    }, [filter, debouncedSearch, page]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    useEffect(() => {
        if (!isStaff) return;
        axios.get('/api/admin/assignees')
            .then((res) => setAssignees(res.data.data))
            .catch(() => toast.error('Failed to load technicians'));
    }, [isStaff]);

    const openReport = (report) => {
        setSelectedReport(report);
        setForm({
            status: report.status,
            priority: report.priority || 'Medium',
            assignedTo: report.assignedTo?._id || '',
            adminNotes: report.adminNotes || '',
            resolutionNotes: report.resolutionNotes || ''
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                status: form.status,
                adminNotes: form.adminNotes,
                resolutionNotes: form.resolutionNotes
            };
            if (isStaff) {
                payload.priority = form.priority;
                payload.assignedTo = form.assignedTo || null;
            }
            const res = await axios.put(`/api/reports/${selectedReport._id}`, payload);
            setReports((prev) => prev.map((r) => (r._id === res.data.data._id ? res.data.data : r)));
            toast.success('Report updated successfully');
            setSelectedReport(null);
        } catch (err) {
            toast.error(errorMessage(err, 'Update failed'));
        } finally {
            setSaving(false);
        }
    };

    const claimReport = async (report) => {
        try {
            const res = await axios.put(`/api/reports/${report._id}`, { assignedTo: user._id, status: 'In Progress' });
            setReports((prev) => prev.map((r) => (r._id === res.data.data._id ? res.data.data : r)));
            toast.success('Report assigned to you');
        } catch (err) {
            toast.error(errorMessage(err, 'Could not take this report'));
        }
    };

    const onDelete = async () => {
        setBusy(true);
        try {
            await axios.delete(`/api/reports/${deleting._id}`);
            toast.success('Report deleted');
            setDeleting(null);
            fetchReports();
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to delete report'));
        } finally {
            setBusy(false);
        }
    };

    const setFilterField = (key) => (e) => {
        setFilter((f) => ({ ...f, [key]: e.target.value }));
        setPage(1);
    };
    const hasFilters = Object.values(filter).some(Boolean) || debouncedSearch;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar
                title="Manage Lab Issues"
                subtitle={isStaff ? 'Triage, assign and track every reported problem' : 'Reports assigned to you and the unassigned queue'}
                actions={
                    <button onClick={fetchReports} className="btn-icon" aria-label="Refresh" disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                }
            />

            <div className="p-4 sm:p-8 space-y-6">
                <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                    <div className="relative sm:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="search"
                            placeholder="Search PC, lab, description..."
                            className="input-field pl-9 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select className="input-field text-sm" value={filter.status} onChange={setFilterField('status')}>
                        <option value="">All Statuses</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="input-field text-sm" value={filter.category} onChange={setFilterField('category')}>
                        <option value="">All Categories</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="input-field text-sm" value={filter.priority} onChange={setFilterField('priority')}>
                        <option value="">All Priorities</option>
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select className="input-field text-sm" value={filter.assignedTo} onChange={setFilterField('assignedTo')}>
                        <option value="">{isStaff ? 'Anyone / unassigned' : 'Mine + unassigned'}</option>
                        <option value="unassigned">Unassigned only</option>
                        <option value={user?._id}>Assigned to me</option>
                        {assignees.filter((a) => a._id !== user?._id).map((a) => (
                            <option key={a._id} value={a._id}>{a.name} ({formatRole(a.role)})</option>
                        ))}
                    </select>
                </div>

                <div className="card p-0 overflow-hidden">
                    {loading && reports.length === 0 ? (
                        <PageLoader />
                    ) : reports.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardList size={28} />}
                            title="No reports found"
                            message={hasFilters ? 'Try changing the filters or search term.' : 'There are no problem reports to manage right now.'}
                        />
                    ) : (
                        <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        <th className="table-head">Issue</th>
                                        <th className="table-head">Location</th>
                                        <th className="table-head">Priority</th>
                                        <th className="table-head">Status</th>
                                        <th className="table-head">Assigned To</th>
                                        <th className="table-head">Reporter</th>
                                        <th className="table-head text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reports.map((report) => (
                                        <tr key={report._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="table-cell max-w-xs">
                                                <p className="font-bold text-slate-800">{report.category}</p>
                                                <p className="text-xs text-slate-500 line-clamp-1">{report.description}</p>
                                            </td>
                                            <td className="table-cell whitespace-nowrap">
                                                <p className="font-medium">{report.lab?.name || 'Deleted lab'}</p>
                                                <p className="text-xs text-slate-400">PC {report.computerNumber}</p>
                                            </td>
                                            <td className="table-cell"><PriorityBadge priority={report.priority} /></td>
                                            <td className="table-cell"><StatusBadge status={report.status} /></td>
                                            <td className="table-cell whitespace-nowrap">
                                                {report.assignedTo
                                                    ? report.assignedTo.name
                                                    : <span className="text-slate-400 italic">Unassigned</span>}
                                            </td>
                                            <td className="table-cell whitespace-nowrap">
                                                <p>{report.user?.name || 'Deleted user'}</p>
                                                <p className="text-xs text-slate-400">{timeAgo(report.createdAt)}</p>
                                            </td>
                                            <td className="table-cell text-right whitespace-nowrap">
                                                {!isStaff && !report.assignedTo && (
                                                    <button onClick={() => claimReport(report)} className="btn-secondary text-xs py-1.5 mr-1" title="Assign to me">
                                                        <UserCheck size={14} /> Take
                                                    </button>
                                                )}
                                                <button onClick={() => openReport(report)} className="btn-icon" aria-label="Open report" title="View / update">
                                                    <Pencil size={16} />
                                                </button>
                                                {isStaff && (
                                                    <button onClick={() => setDeleting(report)} className="btn-icon hover:text-red-600 hover:bg-red-50" aria-label="Delete report" title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {meta.total > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                            <span>
                                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, meta.total)} of {meta.total}
                            </span>
                            <div className="flex items-center gap-1">
                                <button className="btn-icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="px-2">Page {page} of {meta.pages}</span>
                                <button className="btn-icon" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal open={!!selectedReport} onClose={() => setSelectedReport(null)} title="Update Problem Report" size="max-w-2xl">
                {selectedReport && (
                    <div className="divide-y divide-slate-100">
                        <div className="p-6">
                            <ReportDetails report={selectedReport} showInternal />
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {isStaff ? (
                                <Field label="Assign Technician">
                                    <select className="input-field" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}>
                                        <option value="">Unassigned</option>
                                        {assignees.map((t) => (
                                            <option key={t._id} value={t._id}>{t.name} — {formatRole(t.role)}</option>
                                        ))}
                                    </select>
                                </Field>
                            ) : (
                                <Field label="Assigned To">
                                    <input className="input-field" disabled value={selectedReport.assignedTo?.name || `${user.name} (on save)`} />
                                </Field>
                            )}

                            <Field label="Status">
                                <select className="input-field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </Field>

                            {isStaff && (
                                <Field label="Priority" className="sm:col-span-2">
                                    <select className="input-field" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </Field>
                            )}

                            <Field label="Internal Notes" hint="Only visible to technicians and admins" className="sm:col-span-2">
                                <textarea
                                    className="input-field text-sm"
                                    rows="2"
                                    maxLength={2000}
                                    placeholder="Diagnosis, parts ordered, next steps..."
                                    value={form.adminNotes}
                                    onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))}
                                />
                            </Field>

                            <Field label="Response to Reporter" hint="The reporter sees this on their My Reports page" className="sm:col-span-2">
                                <textarea
                                    className="input-field text-sm"
                                    rows="2"
                                    maxLength={2000}
                                    placeholder="What was fixed and how..."
                                    value={form.resolutionNotes}
                                    onChange={(e) => setForm((f) => ({ ...f, resolutionNotes: e.target.value }))}
                                />
                            </Field>

                            <div className="sm:col-span-2 flex gap-3 pt-2">
                                <button type="button" onClick={() => setSelectedReport(null)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 font-bold">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={!!deleting}
                title="Delete report?"
                message={deleting ? `This permanently deletes the ${deleting.category} report for PC ${deleting.computerNumber}. This cannot be undone.` : ''}
                busy={busy}
                onConfirm={onDelete}
                onCancel={() => setDeleting(null)}
            />
        </div>
    );
};

export default ManageIssues;
