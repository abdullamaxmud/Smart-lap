import React from 'react';
import { MapPin, Monitor, User, Calendar, Wrench, CheckCircle2 } from 'lucide-react';
import { StatusBadge, PriorityBadge, Badge } from './ui';
import { formatDate } from '../utils/format';

const Item = ({ icon, label, children }) => (
    <div className="flex gap-3">
        <div className="text-slate-400 mt-0.5">{icon}</div>
        <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">{label}</p>
            <div className="text-sm text-slate-800 font-medium break-words">{children}</div>
        </div>
    </div>
);

// Read-only summary of a report; `showInternal` reveals staff-only notes
const ReportDetails = ({ report, showInternal = false }) => (
    <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status} />
            <PriorityBadge priority={report.priority} />
            <Badge className="bg-slate-50 text-slate-600 border-slate-200">{report.category}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Item icon={<MapPin size={16} />} label="Lab">
                {report.lab?.name || 'Deleted lab'}
                {report.lab?.location && <span className="block text-xs text-slate-500 font-normal">{report.lab.location}</span>}
            </Item>
            <Item icon={<Monitor size={16} />} label="Computer">{report.computerNumber}</Item>
            <Item icon={<User size={16} />} label="Reported by">
                {report.user?.name || 'Deleted user'}
                {report.department?.name && <span className="block text-xs text-slate-500 font-normal">{report.department.name}</span>}
            </Item>
            <Item icon={<Calendar size={16} />} label="Reported on">{formatDate(report.createdAt, true)}</Item>
            <Item icon={<Wrench size={16} />} label="Assigned to">{report.assignedTo?.name || <span className="text-slate-400">Not assigned yet</span>}</Item>
            {report.resolvedAt && (
                <Item icon={<CheckCircle2 size={16} />} label="Resolved on">{formatDate(report.resolvedAt, true)}</Item>
            )}
        </div>

        <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Description</p>
            <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">{report.description}</p>
        </div>

        {report.resolutionNotes && (
            <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-600 mb-1">Technician response</p>
                <p className="text-sm text-slate-700 whitespace-pre-line bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">{report.resolutionNotes}</p>
            </div>
        )}

        {showInternal && report.adminNotes && (
            <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-blue-600 mb-1">Internal notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-line bg-blue-50/60 p-4 rounded-xl border border-blue-100">{report.adminNotes}</p>
            </div>
        )}
    </div>
);

export default ReportDetails;
