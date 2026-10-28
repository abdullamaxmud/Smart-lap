import React, { useEffect } from 'react';
import { X, Inbox, AlertTriangle } from 'lucide-react';
import { statusClasses, priorityClasses, roleClasses, formatRole } from '../utils/format';

export const Badge = ({ className = '', children }) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${className}`}>
        {children}
    </span>
);

export const StatusBadge = ({ status }) => <Badge className={statusClasses[status] || statusClasses.Pending}>{status}</Badge>;

export const PriorityBadge = ({ priority }) =>
    priority ? <Badge className={priorityClasses[priority] || priorityClasses.Medium}>{priority}</Badge> : null;

export const RoleBadge = ({ role }) => <Badge className={roleClasses[role] || roleClasses.user}>{formatRole(role)}</Badge>;

export const Spinner = ({ className = 'h-10 w-10' }) => (
    <div className={`animate-spin rounded-full border-2 border-slate-200 border-t-hu-blue ${className}`} role="status" aria-label="Loading" />
);

export const PageLoader = () => (
    <div className="flex items-center justify-center py-20">
        <Spinner />
    </div>
);

export const EmptyState = ({ icon, title, message, action }) => (
    <div className="text-center py-14 px-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            {icon || <Inbox size={28} />}
        </div>
        <h4 className="text-base font-bold text-slate-700 heading-font">{title}</h4>
        {message && <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">{message}</p>}
        {action && <div className="mt-5">{action}</div>}
    </div>
);

export const Modal = ({ open, onClose, title, children, size = 'max-w-lg' }) => {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div
                role="dialog"
                aria-modal="true"
                className={`relative bg-white w-full ${size} rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col`}
            >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-bold heading-font text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) => (
    <Modal open={open} onClose={onCancel} title={title} size="max-w-md">
        <div className="p-6 space-y-6">
            <div className="flex gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                    <AlertTriangle size={20} />
                </div>
                <p className="text-sm text-slate-600 pt-2">{message}</p>
            </div>
            <div className="flex gap-3 justify-end">
                <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
                    {busy ? 'Please wait...' : confirmLabel}
                </button>
            </div>
        </div>
    </Modal>
);

export const Field = ({ label, hint, children, className = '' }) => (
    <label className={`block space-y-1.5 ${className}`}>
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {children}
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
);

export const StatCard = ({ title, value, icon, hint, tone = 'bg-blue-50' }) => (
    <div className="card">
        <div className="flex justify-between items-start gap-4">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h4 className="text-3xl font-bold mt-1 heading-font text-slate-900">{value}</h4>
            </div>
            <div className={`p-3 rounded-xl ${tone}`}>{icon}</div>
        </div>
        {hint && <p className="mt-3 text-xs text-slate-400">{hint}</p>}
    </div>
);
