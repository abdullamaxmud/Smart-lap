import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { errorMessage } from '../utils/format';

const AuthContext = createContext();
const TOKEN_KEY = 'token';

axios.defaults.withCredentials = true;

const setAuthHeader = (token) => {
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    else delete axios.defaults.headers.common['Authorization'];
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearSession = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthHeader(null);
        setUser(null);
    }, []);

    // Expired, revoked or deactivated sessions send the user back to the login page
    useEffect(() => {
        const id = axios.interceptors.response.use(
            (res) => res,
            (err) => {
                const status = err.response?.status;
                const url = err.config?.url || '';
                const isAuthCall = url.includes('/api/auth/login') || url.includes('/api/auth/register');
                const sessionGone = status === 401 || (status === 403 && /inactive/i.test(err.response?.data?.message || ''));
                if (sessionGone && !isAuthCall && localStorage.getItem(TOKEN_KEY)) {
                    clearSession();
                    toast.error(err.response?.data?.message || 'Your session has ended. Please sign in again.', { id: 'session' });
                }
                return Promise.reject(err);
            }
        );
        return () => axios.interceptors.response.eject(id);
    }, [clearSession]);

    useEffect(() => {
        const checkUserLoggedIn = async () => {
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                setAuthHeader(token);
                const res = await axios.get('/api/auth/me');
                if (res.data.success) setUser(res.data.data);
            } catch (err) {
                clearSession();
            } finally {
                setLoading(false);
            }
        };

        checkUserLoggedIn();
    }, [clearSession]);

    const startSession = (data) => {
        localStorage.setItem(TOKEN_KEY, data.token);
        setAuthHeader(data.token);
        setUser(data.user);
    };

    const login = async (email, password) => {
        try {
            const res = await axios.post('/api/auth/login', { email, password });
            startSession(res.data);
            return { success: true };
        } catch (err) {
            return { success: false, message: errorMessage(err, 'Login failed') };
        }
    };

    const register = async (userData) => {
        try {
            const res = await axios.post('/api/auth/register', userData);
            startSession(res.data);
            return { success: true };
        } catch (err) {
            return { success: false, message: errorMessage(err, 'Registration failed') };
        }
    };

    const logout = async () => {
        try {
            await axios.post('/api/auth/logout');
        } catch {
            // Session is cleared locally regardless
        }
        clearSession();
        toast.success('You have been signed out');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
