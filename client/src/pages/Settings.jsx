import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { UserCircle, ShieldCheck, Mail, Calendar, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useUniversityData } from '../hooks/useUniversityData';
import { Field, RoleBadge } from '../components/ui';
import { errorMessage, formatDate, idOf } from '../utils/format';

const Settings = () => {
    const { user, setUser } = useAuth();
    const { faculties, departmentsOf } = useUniversityData();
    const [profileForm, setProfileForm] = useState({ name: '', faculty: '', department: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                faculty: idOf(user.faculty),
                department: idOf(user.department)
            });
        }
    }, [user]);

    const onSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const res = await axios.put('/api/auth/me', profileForm);
            setUser(res.data.data);
            toast.success('Profile updated');
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to update profile'));
        } finally {
            setSavingProfile(false);
        }
    };

    const onChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('New password and confirmation do not match');
            return;
        }
        setSavingPassword(true);
        try {
            await axios.patch('/api/auth/change-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('Password changed');
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to change password'));
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar title="Settings" subtitle="Manage your profile and account security" />
            <div className="p-4 sm:p-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="card xl:row-span-2 h-fit">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-hu-blue text-white flex items-center justify-center text-3xl font-bold heading-font">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-slate-800">{user?.name}</h3>
                        <div className="mt-2"><RoleBadge role={user?.role} /></div>
                    </div>
                    <dl className="mt-6 space-y-3 text-sm">
                        <div className="flex items-center gap-3 text-slate-600"><Mail size={16} className="text-slate-400" /> {user?.email}</div>
                        <div className="flex items-center gap-3 text-slate-600"><Calendar size={16} className="text-slate-400" /> Member since {formatDate(user?.createdAt)}</div>
                        {user?.lastLogin && (
                            <div className="flex items-center gap-3 text-slate-600"><Clock size={16} className="text-slate-400" /> Last sign-in {formatDate(user.lastLogin, true)}</div>
                        )}
                    </dl>
                </section>

                <section className="card xl:col-span-2">
                    <h3 className="text-lg font-bold heading-font mb-1 flex items-center gap-2"><UserCircle size={20} /> Profile</h3>
                    <p className="text-sm text-slate-500 mb-5">Your faculty and department are pre-filled when you report a problem.</p>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSaveProfile}>
                        <Field label="Full Name" className="md:col-span-2">
                            <input
                                className="input-field"
                                value={profileForm.name}
                                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                                required
                            />
                        </Field>
                        <Field label="Faculty">
                            <select
                                className="input-field"
                                value={profileForm.faculty}
                                onChange={(e) => setProfileForm((p) => ({ ...p, faculty: e.target.value, department: '' }))}
                            >
                                <option value="">No faculty</option>
                                {faculties.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Department">
                            <select
                                className="input-field"
                                value={profileForm.department}
                                onChange={(e) => setProfileForm((p) => ({ ...p, department: e.target.value }))}
                                disabled={!profileForm.faculty}
                            >
                                <option value="">No department</option>
                                {departmentsOf(profileForm.faculty).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </Field>
                        <div className="md:col-span-2">
                            <button className="btn-primary" type="submit" disabled={savingProfile}>
                                {savingProfile ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="card xl:col-span-2">
                    <h3 className="text-lg font-bold heading-font mb-1 flex items-center gap-2"><ShieldCheck size={20} /> Change Password</h3>
                    <p className="text-sm text-slate-500 mb-5">Use at least 6 characters. You stay signed in after changing it.</p>
                    <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={onChangePassword}>
                        <Field label="Current password">
                            <input
                                className="input-field"
                                type="password"
                                autoComplete="current-password"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                                required
                            />
                        </Field>
                        <Field label="New password">
                            <input
                                className="input-field"
                                type="password"
                                minLength={6}
                                autoComplete="new-password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                                required
                            />
                        </Field>
                        <Field label="Confirm new password">
                            <input
                                className="input-field"
                                type="password"
                                minLength={6}
                                autoComplete="new-password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                                required
                            />
                        </Field>
                        <div className="md:col-span-3">
                            <button className="btn-primary" type="submit" disabled={savingPassword}>
                                {savingPassword ? 'Updating...' : 'Change Password'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default Settings;
