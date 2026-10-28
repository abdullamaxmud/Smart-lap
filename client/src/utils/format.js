export const STATUSES = ['Pending', 'In Progress', 'Resolved'];
export const CATEGORIES = ['Hardware', 'Software', 'Network', 'Power', 'Other'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const ROLES = ['user', 'technician', 'admin', 'super_admin'];

export const formatRole = (role) =>
    (role || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const formatAction = (action) => (action || '').replace(/_/g, ' ');

export const formatDate = (value, withTime = false) => {
    if (!value) return '-';
    const date = new Date(value);
    return withTime
        ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
        : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const timeAgo = (value) => {
    if (!value) return '';
    const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const units = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60]
    ];
    for (const [name, secs] of units) {
        const n = Math.floor(seconds / secs);
        if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
    }
    return '';
};

export const errorMessage = (err, fallback = 'Something went wrong') =>
    err?.response?.data?.message || err?.response?.data?.error || (err?.request && !err?.response ? 'Cannot reach the server. Check your connection.' : fallback);

export const statusClasses = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
    Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

export const priorityClasses = {
    Low: 'bg-slate-50 text-slate-600 border-slate-200',
    Medium: 'bg-sky-50 text-sky-700 border-sky-200',
    High: 'bg-orange-50 text-orange-700 border-orange-200',
    Critical: 'bg-red-50 text-red-700 border-red-200'
};

export const roleClasses = {
    super_admin: 'bg-red-50 text-red-700 border-red-200',
    admin: 'bg-orange-50 text-orange-700 border-orange-200',
    technician: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    user: 'bg-slate-50 text-slate-600 border-slate-200'
};

export const idOf = (value) => (value && typeof value === 'object' ? value._id : value) || '';
