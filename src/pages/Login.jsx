import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Building2, ArrowRight } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('admin@inmoapp.com');
    const [password, setPassword] = useState('admin123');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { error, success } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            success('¡Bienvenido de nuevo!');
            navigate('/');
        } catch (err) {
            error('Credenciales inválidas. Por favor, reintenta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1f9 100%)',
            padding: '2rem'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '3rem',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '2rem'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                        boxShadow: '0 10px 20px rgba(249, 115, 22, 0.2)'
                    }}>
                        <Building2 color="white" size={32} />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: '800', background: 'linear-gradient(to right, #f97316, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        InmoApp
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gestión inmobiliaria inteligente y moderna.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>Email Corporativo</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                style={{ paddingLeft: '2.75rem', borderRadius: '1rem', background: 'white' }}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{ paddingLeft: '2.75rem', borderRadius: '1rem', background: 'white' }}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-orange"
                        style={{
                            marginTop: '0.5rem',
                            padding: '1rem',
                            borderRadius: '1rem',
                            fontWeight: '700',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                        disabled={loading}
                    >
                        {loading ? 'Accediendo...' : 'Ingresar al Portal'}
                        {!loading && <ArrowRight size={18} />}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <a href="#" style={{ color: 'var(--secondary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '600' }}>¿Olvidaste tu contraseña?</a>
                    </div>
                </form>
            </div>

            <div style={{ position: 'absolute', bottom: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                &copy; 2026 InmoApp • Sanchez Inmobiliaria
            </div>
        </div>
    );
};

export default Login;
