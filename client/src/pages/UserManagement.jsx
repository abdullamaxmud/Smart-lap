import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { UserPlus, Pencil, Trash2, Search, Users, KeyRound } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useUniversityData } from '../hooks/useUniversityData';
import { Modal, ConfirmDialog, Field, PageLoader, EmptyState, RoleBadge, Badge } from '../components/ui';
import { ROLES, formatRole, errorMessage, idOf, timeAgo } from '../utils/format';

const emptyForm = { name: '', email: '', password: '', role: 'user', faculty: '', department: '', isActive: true };

const UserManagement = () => {
    const { user: me } = useAuth();
    const { faculties, departmentsOf } = useUniversityData();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');

    const [mode, setMode] = useState(null); // 'create' | 'edit'
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [resetPassword, setResetPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/users');
            setUsers(res.data.data || []);
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to fetch users'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        const q = query.toLowerCase();
        return users.filter((u) => {
            const matchesSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
            const matchesRole = !roleFilter || u.role === roleFilter;
            const matchesActive = !activeFilter || (activeFilter === 'active') === !!u.isActive;
            return matchesSearch && matchesRole && matchesActive;
        });
    }, [users, query, roleFilter, activeFilter]);

    const roleCounts = useMemo(
        () => Object.fromEntries(ROLES.map((r) => [r, users.filter((u) => u.role === r).length])),
        [users]
    );

    const openCreate = () => {
        setForm(emptyForm);
        setEditing(null);
        setMode('create');
    };

    const openEdit = (u) => {
        setEditing(u);
        setForm({
            name: u.name || '',
            email: u.email,
            password: '',
            role: u.role,
            faculty: idOf(u.faculty),
            department: idOf(u.department),
            isActive: !!u.isActive
        });
        setResetPassword('');
        setMode('edit');
    };

    const closeModal = () => setMode(null);

    const onSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (mode === 'create') {
                const res = await axios.post('/api/admin/users', form);
                setUsers((prev) => [res.data.data, ...prev]);
                toast.success('User created');
            } else {
                const { name, role, faculty, department, isActive } = form;
                const res = await axios.put(`/api/admin/users/${editing._id}`, { name, role, faculty, department, isActive });
                setUsers((prev) => prev.map((u) => (u._id === editing._id ? res.data.data : u)));
                toast.success('User updated');
            }
            closeModal();
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to save user'));
        } finally {
            setSaving(false);
        }
    };

    const onResetPassword = async () => {
        if (resetPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        try {
            await axios.patch(`/api/admin/users/${editing._id}/reset-password`, { password: resetPassword });
            setResetPassword('');
            toast.success(`Password reset for ${editing.name}`);
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to reset password'));
        }
    };

    const onDelete = async () => {
        setSaving(true);
        try {
            await axios.delete(`/api/admin/users/${deleting._id}`);
            setUsers((prev) => prev.filter((u) => u._id !== deleting._id));
            toast.success('User deleted');
            setDeleting(null);
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to delete user'));
        } finally {
            setSaving(false);
        }
    };

    const isSelf = (u) => u._id === me?._id;
    const isProtected = (u) => u.role === 'super_admin' && !isSelf(u);

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar
                title="User Management"
                subtitle={`${users.length} accounts · ${roleCounts.technician || 0} technicians · ${roleCounts.admin || 0} admins`}
                actions={
                    <button className="btn-primary" onClick={openCreate}>
                        <UserPlus size={18} /> <span className="hidden sm:inline">Add User</span>
                    </button>
                }
            />

            <div className="p-4 sm:p-8 space-y-6">
                <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input className="input-field pl-9 text-sm" type="search" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <select className="input-field text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                        <option value="">All roles</option>
                        {ROLES.map((r) => <option key={r} value={r}>{formatRole(r)} ({roleCounts[r] || 0})</option>)}
                    </select>
                    <select className="input-field text-sm" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                <div className="card p-0 overflow-hidden">
                    {loading ? (
                        <PageLoader />
                    ) : filteredUsers.length === 0 ? (
                        <EmptyState icon={<Users size={28} />} title="No users found" message="Try a different search or filter." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="table-head">User</th>
                                        <th className="table-head">Role</th>
                                        <th className="table-head">Faculty / Department</th>
                                        <th className="table-head">Status</th>
                                        <th className="table-head">Last Login</th>
                                        <th className="table-head text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((u) => (
                                        <tr key={u._id} className="hover:bg-slate-50">
                                            <td className="table-cell">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 shrink-0 rounded-full bg-hu-blue/10 text-hu-blue flex items-center justify-center font-bold">
                                                        {u.name?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-800 truncate">
                                                            {u.name} {isSelf(u) && <span className="text-xs text-slate-400 font-normal">(you)</span>}
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="table-cell"><RoleBadge role={u.role} /></td>
                                            <td className="table-cell">
                                                <p className="truncate max-w-[14rem]">{u.faculty?.name || '-'}</p>
                                                <p className="text-xs text-slate-400 truncate max-w-[14rem]">{u.department?.name || ''}</p>
                                            </td>
                                            <td className="table-cell">
                                                {u.isActive
                                                    ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                                                    : <Badge className="bg-slate-100 text-slate-500 border-slate-200">Inactive</Badge>}
                                            </td>
                                            <td className="table-cell text-slate-500 whitespace-nowrap">{u.lastLogin ? timeAgo(u.lastLogin) : 'Never'}</td>
                                            <td className="table-cell text-right whitespace-nowrap">
                                                <button className="btn-icon" onClick={() => openEdit(u)} disabled={isProtected(u)} title={isProtected(u) ? 'Other super admins cannot be modified' : 'Edit'} aria-label="Edit user">
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    className="btn-icon hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => setDeleting(u)}
                                                    disabled={isSelf(u) || u.role === 'super_admin'}
                                                    title="Delete"
                                                    aria-label="Delete user"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Modal open={!!mode} onClose={closeModal} title={mode === 'create' ? 'Add New User' : `Edit ${editing?.name || 'User'}`}>
                <form onSubmit={onSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full Name" className="sm:col-span-2">
                        <input className="input-field" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                    </Field>
                    <Field label="Email" className="sm:col-span-2">
                        <input
                            className="input-field"
                            type="email"
                            required
                            disabled={mode === 'edit'}
                            value={form.email}
                            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        />
                    </Field>
                    {mode === 'create' && (
                        <Field label="Temporary Password" hint="Share it with the user; they can change it in Settings." className="sm:col-span-2">
                            <input className="input-field" type="text" required minLength={6} autoComplete="off" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                        </Field>
                    )}
                    <Field label="Role" className="sm:col-span-2">
                        <select
                            className="input-field"
                            value={form.role}
                            disabled={mode === 'edit' && isSelf(editing)}
                            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                        >
                            {ROLES.map((r) => <option key={r} value={r}>{formatRole(r)}</option>)}
                        </select>
                    </Field>
                    <Field label="Faculty">
                        <select className="input-field" value={form.faculty} onChange={(e) => setForm((p) => ({ ...p, faculty: e.target.value, department: '' }))}>
                            <option value="">No Faculty</option>
                            {faculties.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Department">
                        <select className="input-field" value={form.department} disabled={!form.faculty} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}>
                            <option value="">No Department</option>
                            {departmentsOf(form.faculty).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                    </Field>
                    {mode === 'edit' && (
                        <label className="sm:col-span-2 flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                            <span className="text-sm">
                                <span className="font-semibold text-slate-700 block">Active account</span>
                                <span className="text-xs text-slate-400">Inactive users cannot sign in</span>
                            </span>
                            <input
                                type="checkbox"
                                className="w-5 h-5 accent-hu-blue"
                                checked={form.isActive}
                                disabled={isSelf(editing)}
                                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                            />
                        </label>
                    )}

                    <div className="sm:col-span-2 flex gap-3 pt-2">
                        <button type="button" className="btn-secondary flex-1" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn-primary flex-1" disabled={saving}>
                            {saving ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
                        </button>
                    </div>

                    {mode === 'edit' && (
                        <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2 space-y-2">
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><KeyRound size={16} /> Reset Password</p>
                            <div className="flex gap-2">
                                <input
                                    className="input-field"
                                    type="text"
                                    autoComplete="off"
                                    placeholder="New password (min 6 chars)"
                                    value={resetPassword}
                                    onChange={(e) => setResetPassword(e.target.value)}
                                />
                                <button type="button" className="btn-secondary shrink-0" onClick={onResetPassword}>Reset</button>
                            </div>
                        </div>
                    )}
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleting}
                title="Delete user?"
                message={deleting ? `${deleting.name} (${deleting.email}) will be permanently deleted. Users linked to reports can only be deactivated.` : ''}
                busy={saving}
                onConfirm={onDelete}
                onCancel={() => setDeleting(null)}
            />
        </div>
    );
};

export default UserManagement;
