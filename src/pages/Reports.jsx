import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { TrendingUp, TrendingDown, RefreshCw, Download, FileText, Calendar, User, DollarSign, PieChart, Printer } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Reports = () => {
    const { success, error } = useToast();
    const [cashFlow, setCashFlow] = useState({ income: 0, expenses: 0, balance: 0 });
    const [cfType, setCfType] = useState('monthly');
    const [cfDate, setCfDate] = useState(new Date().toISOString().split('T')[0]);

    const [owners, setOwners] = useState([]);
    const [selectedOwner, setSelectedOwner] = useState('');
    const [liquidation, setLiquidation] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchCashFlow = () => {
        api.get(`/reports/cash-flow?type=${cfType}&date=${cfDate}`)
            .then(res => setCashFlow(res.data))
            .catch(err => error('Err: No se pudo obtener el flujo de caja'));
    };

    const fetchOwners = () => {
        api.get('/owners')
            .then(res => setOwners(res.data))
            .catch(err => error('Err: No se pudo cargar propietarios'));
    };

    useEffect(() => {
        fetchCashFlow();
        fetchOwners();
    }, [cfType, cfDate]);

    const handleGenerateLiquidation = async () => {
        if (!selectedOwner) {
            error('Seleccione un propietario primero');
            return;
        }
        setLoading(true);
        try {
            const res = await api.get(`/reports/liquidation/${selectedOwner}`);
            setLiquidation(res.data);
            success('Liquidación generada con éxito');
        } catch (err) {
            error('Error al generar la liquidación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>Reportes Financieros</h1>
                <p style={{ color: 'var(--text-muted)' }}>Análisis de ingresos, egresos y liquidaciones de cartera.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                {/* Card Flujo de Caja */}
                <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)', borderRadius: '8px' }}>
                                <PieChart size={20} />
                            </div>
                            <h3 style={{ margin: 0 }}>Flujo de Caja</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select value={cfType} onChange={e => setCfType(e.target.value)} style={{ padding: '0.5rem', width: 'auto', fontSize: '0.85rem' }}>
                                <option value="daily">Diaria</option>
                                <option value="monthly">Mensual</option>
                                <option value="yearly">Anual</option>
                            </select>
                            <input type="date" value={cfDate} onChange={e => setCfDate(e.target.value)} style={{ padding: '0.5rem', width: 'auto', fontSize: '0.85rem' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#16a34a' }}>
                                <TrendingUp size={24} />
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>INGRESOS</div>
                                    <div style={{ fontSize: '0.9rem', color: '#15803d' }}>Cobro de Alquileres</div>
                                </div>
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#15803d' }}>+ ${new Intl.NumberFormat('es-AR').format(cashFlow.income)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#fef2f2', borderRadius: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                                <TrendingDown size={24} />
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>EGRESOS</div>
                                    <div style={{ fontSize: '0.9rem', color: '#b91c1c' }}>Gastos de Mantenimiento</div>
                                </div>
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#b91c1c' }}>- ${new Intl.NumberFormat('es-AR').format(cashFlow.expenses)}</span>
                        </div>

                        <div style={{ borderTop: '2px dashed var(--border)', paddingTop: '1.25rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-muted)' }}>BALANCE NETO</span>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Periodo seleccionado</div>
                            </div>
                            <span style={{ fontWeight: 900, fontSize: '2rem', color: cashFlow.balance >= 0 ? '#16a34a' : '#ef4444' }}>
                                ${new Intl.NumberFormat('es-AR').format(cashFlow.balance)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Card Liquidación */}
                <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                        <div style={{ padding: '8px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', borderRadius: '8px' }}>
                            <FileText size={20} />
                        </div>
                        <h3 style={{ margin: 0 }}>Liquidación a Propietario</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Detalle consolidado de rentas y deducciones para pago a dueños.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} color="var(--secondary)" /> Seleccionar Propietario</label>
                            <select value={selectedOwner} onChange={e => setSelectedOwner(e.target.value)} style={{ background: 'white' }}>
                                <option value="">Elija un dueño...</option>
                                {owners.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name} ({o.dni})</option>)}
                            </select>
                        </div>
                        <button className="btn btn-primary" onClick={handleGenerateLiquidation} disabled={loading} style={{ height: '3.5rem', fontSize: '1rem', fontWeight: 700 }}>
                            <RefreshCw size={20} className={loading ? 'spin' : ''} /> {loading ? 'Procesando...' : 'Generar Liquidación'}
                        </button>
                    </div>
                </div>
            </div>

            {liquidation && (
                <div className="card" style={{ border: '1px solid var(--primary)', padding: '3rem', maxWidth: '900px', margin: '0 auto', boxShadow: 'var(--shadow-xl)', animation: 'slideIn 0.5s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '2rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                                <div style={{ padding: '10px', background: 'var(--primary)', color: 'white', borderRadius: '12px' }}>
                                    <Printer size={24} />
                                </div>
                                <h2 style={{ margin: 0, fontSize: '2rem' }}>Detalle de Liquidación</h2>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                                Propietario: <strong>{liquidation.owner.first_name} {liquidation.owner.last_name}</strong>
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                <Calendar size={16} /> Periodo: {liquidation.month}/{liquidation.year}
                            </div>
                        </div>
                        <button className="btn btn-orange" onClick={() => window.print()} style={{ padding: '0.75rem 1.5rem' }}>
                            <Download size={18} /> Descargar PDF
                        </button>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: '1.5rem', padding: '2rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ padding: '1.25rem 0', color: 'var(--text-main)', fontSize: '1rem' }}>Concepto Detallado</th>
                                    <th style={{ padding: '1.25rem 0', textAlign: 'right', color: 'var(--text-main)', fontSize: '1rem' }}>Monto ($)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {liquidation.payments.map((p, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1.25rem 0' }}>
                                            <div style={{ fontWeight: 600 }}>Cobro de Alquiler</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.contract.property.street} {p.contract.property.number}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 0', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>+ ${new Intl.NumberFormat('es-AR').format(p.amount)}</td>
                                    </tr>
                                ))}
                                {liquidation.maintenances.map((m, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1.25rem 0' }}>
                                            <div style={{ fontWeight: 600 }}>Gasto: {m.description}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mantenimiento Inmueble</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 0', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>- ${new Intl.NumberFormat('es-AR').format(m.cost)}</td>
                                    </tr>
                                ))}
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1.25rem 0' }}>
                                        <div style={{ fontWeight: 600 }}>Honorarios de Administración</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Comisión Estándar 10%</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 0', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>- ${new Intl.NumberFormat('es-AR').format(liquidation.commission)}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td style={{ padding: '2rem 0 0', fontSize: '1.5rem', fontWeight: 800 }}>NETO A PERCIBIR</td>
                                    <td style={{ padding: '2rem 0 0', textAlign: 'right', fontSize: '2rem', color: '#16a34a', fontWeight: 900 }}>
                                        $ {new Intl.NumberFormat('es-AR').format(liquidation.net_amount)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Este documento es una liquidación interna de Sanchez Inmobiliaria. Sujetos a validación contable.
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
