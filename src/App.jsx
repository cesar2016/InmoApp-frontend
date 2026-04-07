import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Owners from './pages/Owners';
import Properties from './pages/Properties';
import Tenants from './pages/Tenants';
import Contracts from './pages/Contracts';
import Reports from './pages/Reports';
import Maintenances from './pages/Maintenances';
import Guarantors from './pages/Guarantors';
import Layout from './components/Layout';
import './index.css';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '1rem 2rem' }}>Iniciando Sesión...</div>
        </div>
    );
    return user ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <ConfirmProvider>
                    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                                <Route index element={<Dashboard />} />
                                <Route path="owners" element={<Owners />} />
                                <Route path="properties" element={<Properties />} />
                                <Route path="tenants" element={<Tenants />} />
                                <Route path="contracts" element={<Contracts />} />
                                <Route path="reports" element={<Reports />} />
                                <Route path="maintenances" element={<Maintenances />} />
                                <Route path="guarantors" element={<Guarantors />} />
                            </Route>
                        </Routes>
                    </Router>
                </ConfirmProvider>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
