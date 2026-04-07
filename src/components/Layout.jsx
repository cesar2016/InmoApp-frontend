import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Home,
    FileText,
    Wrench,
    ShieldCheck,
    Menu,
    X,
    LogOut,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { logout } = useAuth();
    const location = useLocation();

    const menuItems = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Inquilinos', path: '/tenants', icon: <Users size={20} /> },
        { name: 'Propietarios', path: '/owners', icon: <Users size={20} /> },
        { name: 'Propiedades', path: '/properties', icon: <Home size={20} /> },
        { name: 'Contratos', path: '/contracts', icon: <FileText size={20} /> },
        { name: 'Mantenimiento', path: '/maintenances', icon: <Wrench size={20} /> },
        { name: 'Garantes', path: '/guarantors', icon: <ShieldCheck size={20} /> },
    ];

    return (
        <div className="layout-container">
            {/* Sidebar */}
            <aside className={`sidebar ${!isSidebarOpen ? 'closed' : ''}`}>
                <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/logo.png" alt="InmoApp Logo" style={{ height: '40px', objectFit: 'contain' }} />
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.name}</span>
                            {location.pathname === item.path && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
                        </Link>
                    ))}
                </nav>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={logout}
                        className="nav-item"
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`main-content ${!isSidebarOpen ? 'collapsed' : ''}`}>
                <header className="navbar">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px',
                            borderRadius: '8px',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <img src="/client_logo.png" alt="Client Logo" style={{ maxHeight: '75px', objectFit: 'contain' }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right', display: 'none', sm: 'block' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Admin Usuario</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Super Administrador</div>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--gradient-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 6px rgba(139, 92, 246, 0.2)'
                        }}>
                            A
                        </div>
                    </div>
                </header>

                <div className="content-inner">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
