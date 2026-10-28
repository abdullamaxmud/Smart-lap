import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Monitor, User, Mail, Lock } from 'lucide-react';
import { useUniversityData } from '../hooks/useUniversityData';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        faculty: '',
        department: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user, loading, register } = useAuth();
    const { faculties, departmentsOf } = useUniversityData();
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'Create Account · HU Smart Lab';
    }, []);

    if (!loading && user) return <Navigate to="/dashboard" replace />;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
            ...(name === 'faculty' ? { department: '' } : {})
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setIsSubmitting(true);
        const { confirmPassword, ...payload } = formData;
        const result = await register(payload);
        setIsSubmitting(false);
        if (result.success) {
            toast.success('Registration successful!');
            navigate('/dashboard', { replace: true });
        } else {
            toast.error(result.message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 flex items-center justify-center p-4 py-12">
            <div className="max-w-xl w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-hu-blue shadow-lg mb-4">
                        <Monitor className="text-hu-gold" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 heading-font">Create Account</h1>
                    <p className="text-slate-500 mt-1">Join the HU Smart Lab system to report lab problems</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1 md:col-span-2">
                            <label htmlFor="name" className="text-sm font-semibold text-slate-700">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input id="name" name="name" type="text" required autoComplete="name" className="input-field pl-10" placeholder="Ahmad Mohamed" value={formData.name} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input id="email" name="email" type="email" required autoComplete="email" className="input-field pl-10" placeholder="ahmad@hu.edu.so" value={formData.email} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="faculty" className="text-sm font-semibold text-slate-700">Faculty</label>
                            <select id="faculty" name="faculty" required className="input-field" value={formData.faculty} onChange={handleChange}>
                                <option value="">Select Faculty</option>
                                {faculties.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="department" className="text-sm font-semibold text-slate-700">Department</label>
                            <select id="department" name="department" required className="input-field" value={formData.department} onChange={handleChange} disabled={!formData.faculty}>
                                <option value="">Select Department</option>
                                {departmentsOf(formData.faculty).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className="input-field pl-10" placeholder="At least 6 characters" value={formData.password} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} autoComplete="new-password" className="input-field pl-10" placeholder="Repeat password" value={formData.confirmPassword} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-2">
                            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 font-bold">
                                {isSubmitting ? 'Creating account...' : 'Create Account'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-sm">
                            Already have an account? <Link to="/login" className="text-hu-blue font-bold hover:underline">Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
