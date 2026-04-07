import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    AlertCircle,
    Calendar,
    DollarSign,
    TrendingUp,
    Users,
    Home,
    FileText,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

const Dashboard = () => {
    const [alerts, setAlerts] = useState({
        expiring_contracts: [],
        increase_alerts: [],
        missing_payments: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/reports/alerts')
            .then(res => setAlerts(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const stats = [
        { name: 'Vencimientos', value: alerts.expiring_contracts.length, icon: <Calendar />, color: '#ef4444', bg: '#fee2e2' },
        { name: 'Aumentos', value: alerts.increase_alerts.length, icon: <TrendingUp />, color: '#8b5cf6', bg: '#ddd6fe' },
        { name: 'Sin Pago', value: alerts.missing_payments.length, icon: <AlertCircle />, color: '#f59e0b', bg: '#fef3c7' },
        { name: 'Contratos', value: '12', icon: <FileText />, color: '#3b82f6', bg: '#dbeafe' }, // Placeholder for total
    ];

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '1rem 2rem' }}>Cargando Panel...</div>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Panel de Control</h1>
                <p style={{ color: 'var(--text-muted)' }}>Bienvenido de nuevo, aquí tienes el resumen de hoy.</p>
            </div>

            {/* Stats Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3rem'
            }}>
                {stats.map((stat, i) => (
                    <div key={i} className="card stat-card">
                        <div className="stat-icon" style={{ backgroundColor: stat.bg, color: stat.color }}>
                            {React.cloneElement(stat.icon, { size: 24 })}
                        </div>
                        <div className="stat-info">
                            <span>{stat.name}</span>
                            <h3>{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

                {/* Alertas de Vencimiento */}
                <div className="card glass" style={{ borderTop: '4px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '8px', background: '#fee2e2', borderRadius: '8px', color: '#ef4444' }}>
                                <Calendar size={20} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Contratos por Vencer</h3>
                        </div>
                        <span className="badge badge-error">{alerts.expiring_contracts.length}</span>
                    </div>

                    {alerts.expiring_contracts.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay vencimientos próximos.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {alerts.expiring_contracts.map(contract => (
                                <div key={contract.id} style={{
                                    padding: '1rem',
                                    background: '#fff',
                                    borderRadius: '12px',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{contract.tenant.first_name} {contract.tenant.last_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{contract.property.street} {contract.property.number}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '600' }}>{contract.end_date}</div>
                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Expira</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Alertas de Aumento */}
                <div className="card glass" style={{ borderTop: '4px solid #8b5cf6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '8px', background: '#ddd6fe', borderRadius: '8px', color: '#8b5cf6' }}>
                                <TrendingUp size={20} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Aumentos este Mes</h3>
                        </div>
                        <span className="badge badge-warning" style={{ background: '#ddd6fe', color: '#5b21b6' }}>{alerts.increase_alerts.length}</span>
                    </div>

                    {alerts.increase_alerts.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Sin aumentos programados.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {alerts.increase_alerts.map(contract => (
                                <div key={contract.id} style={{
                                    padding: '1rem',
                                    background: '#fff',
                                    borderRadius: '12px',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{contract.tenant.first_name} {contract.tenant.last_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{contract.increase_frequency_months} meses</div>
                                    </div>
                                    <button className="btn" style={{ padding: '0.5rem', background: '#f5f3ff', color: '#8b5cf6' }}>
                                        <ArrowUpRight size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Alertas de Falta de Pago */}
                <div className="card glass" style={{ borderTop: '4px solid #f59e0b', gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '8px', color: '#d97706' }}>
                                <AlertCircle size={20} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Alquileres Pendientes de Cobro</h3>
                        </div>
                        <span className="badge badge-error" style={{ background: '#fef3c7', color: '#92400e' }}>{alerts.missing_payments.length}</span>
                    </div>

                    {alerts.missing_payments.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Todos los pagos están al día.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {alerts.missing_payments.map(contract => (
                                <div key={contract.id} style={{
                                    padding: '1rem',
                                    background: '#fff',
                                    borderRadius: '12px',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{contract.tenant.first_name} {contract.tenant.last_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Período: Abril 2024</div>
                                        </div>
                                    </div>
                                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                                        Cobrar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
