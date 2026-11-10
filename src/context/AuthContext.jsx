import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const BLOCKED_MESSAGE =
    'Su periodo de prueba GRATUITO ha caducado, póngase en contacto con el Server Administrator';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [blocked, setBlocked] = useState(false);
    const [blockedMessage, setBlockedMessage] = useState(BLOCKED_MESSAGE);

    useEffect(() => {
        const onBlocked = (e) => {
            setBlockedMessage(e.detail?.message || BLOCKED_MESSAGE);
            setBlocked(true);
            setUser(null);
        };
        window.addEventListener('app:blocked', onBlocked);
        return () => window.removeEventListener('app:blocked', onBlocked);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/me')
                .then(res => setUser(res.data))
                .catch((err) => {
                    localStorage.removeItem('token');
                    if (err.response?.data?.code === 'payment_expired') {
                        setBlockedMessage(err.response.data.message || BLOCKED_MESSAGE);
                        setBlocked(true);
                    }
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/login', { email, password });
        localStorage.setItem('token', res.data.access_token);
        setUser(res.data.user);
        return res.data;
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (e) { }
        localStorage.removeItem('token');
        setUser(null);
        setBlocked(false);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, blocked, blockedMessage, setBlocked }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
