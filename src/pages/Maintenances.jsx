import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, X, Trash2, Wrench, Search, Home as HomeIcon, Calendar, DollarSign, AlertTriangle, Edit2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const Maintenances = () => {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const [maintenances, setMaintenances] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        property_id: '',
        description: '',
        cost: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [maintRes, propRes] = await Promise.all([
                api.get('/maintenances'),
                api.get('/properties')
            ]);
            setMaintenances(maintRes.data);
            setProperties(propRes.data);
        } catch (err) {
            error('Error al cargar mantenimientos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredMaintenances = maintenances.filter(m => {
        const search = searchTerm.toLowerCase();
        const propAddress = `${m.property?.street} ${m.property?.number}`.toLowerCase();
        return (
            propAddress.includes(search) ||
            m.description.toLowerCase().includes(search) ||
            m.cost.toString().includes(search) ||
            m.date.toLowerCase().includes(search)
        );
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/maintenances', formData);
            success('Gasto de mantenimiento registrado');
            setShowModal(false);
            setFormData({
                property_id: '',
                description: '',
                cost: '',
                date: new Date().toISOString().split('T')[0]
            });
            fetchData();
        } catch (err) {
            error('Error al registrar el arreglo');
        }
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm('¿Eliminar Registro?', '¿Estás seguro de que deseas eliminar este registro de mantenimiento? Esta operación no se puede deshacer.');
        if (isConfirmed) {
            try {
                await api.delete(`/maintenances/${id}`);
                success('Registro eliminado');
                fetchData();
            } catch (err) {
                error('No se pudo eliminar el registro');
            }
        }
    };

    return (
        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Mantenimiento</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Seguimiento de reparaciones, arreglos y gastos de inmuebles.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="search-wrapper">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar arreglo o propiedad..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-orange" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Nuevo Arreglo
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Inmueble</th>
                                <th>Descripción del Trabajo</th>
                                <th>Costo</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando registros...</td></tr>
                            ) : filteredMaintenances.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No hay mantenimientos registrados.</td></tr>
                            ) : filteredMaintenances.map(m => (
                                <tr key={m.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                            <Calendar size={14} color="var(--text-muted)" />
                                            {m.date}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <HomeIcon size={16} />
                                            </div>
                                            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{m.property.street} {m.property.number}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                            <div style={{ marginTop: '3px' }}><Wrench size={14} color="var(--secondary)" /></div>
                                            <span style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{m.description}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                                            ${new Intl.NumberFormat('es-AR').format(m.cost)}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleDelete(m.id)} className="btn" style={{ padding: '0.5rem', background: '#fef2f2', color: '#ef4444' }} title="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '550px', position: 'relative', padding: '2.5rem' }}>
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                <Wrench size={24} color="var(--primary)" />
                                <h2 style={{ margin: 0 }}>Registrar Arreglo</h2>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Detalla la reparación realizada y su costo asociado para el balance.</p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HomeIcon size={14} color="var(--secondary)" /> Inmueble Afectado</label>
                                <select value={formData.property_id} onChange={e => setFormData({ ...formData, property_id: e.target.value })} required>
                                    <option value="">Seleccione inmueble...</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.street} {p.number} ({p.location})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Edit2 size={14} /> Descripción del Trabajo</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    rows={4}
                                    placeholder="Ej: Reparación de cañería en baño principal, cambio de grifería..."
                                    style={{ resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DollarSign size={14} /> Costo Total ($)</label>
                                    <input type="number" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} required style={{ background: 'white' }} placeholder="0.00" />
                                </div>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Fecha</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required style={{ background: 'white' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1rem', background: '#fff7ed', color: '#9a3412', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #ffedd5' }}>
                                <AlertTriangle size={18} />
                                <span>Este gasto se deducirá del balance mensual de la propiedad.</span>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                                    Guardar Registro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Maintenances;
