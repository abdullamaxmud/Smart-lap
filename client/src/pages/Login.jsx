import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Monitor, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user, loading, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        document.title = 'Sign In · HU Smart Lab';
    }, []);

    if (!loading && user) return <Navigate to="/dashboard" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await login(email, password);
        setIsSubmitting(false);
        if (result.success) {
            toast.success('Welcome back to HU Smart Lab!');
            navigate(location.state?.from || '/dashboard', { replace: true });
        } else {
            toast.error(result.message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-hu-blue shadow-lg mb-6">
                        <Monitor className="text-hu-gold" size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 heading-font">Hormuud University</h1>
                    <p className="text-slate-500 mt-2 font-medium">Smart Lab Management System</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">Sign In</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="input-field pl-10"
                                    placeholder="your@hu.edu.so"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    className="input-field pl-10 pr-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 pt-1">Forgot your password? Contact the IT office to have it reset.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary w-full py-3 mt-2"
                        >
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                            {!isSubmitting && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-sm">
                            Don't have an account? <Link to="/register" className="text-hu-blue font-bold hover:underline">Register here</Link>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-slate-400 text-xs">
                    &copy; {new Date().getFullYear()} Hormuud University IT Services. All Rights Reserved.
                </p>
            </div>
        </div>
    );
};

export default Login;
