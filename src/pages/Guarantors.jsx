import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X, Search, Shield, User, Phone, Mail, MapPin } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const Guarantors = () => {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const [guarantors, setGuarantors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingGuarantor, setEditingGuarantor] = useState(null);
    const [tenants, setTenants] = useState([]);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dni: '',
        address: '',
        whatsapp: '',
        email: '',
        tenant_id: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [guaRes, tenRes] = await Promise.all([
                api.get('/guarantors'),
                api.get('/tenants')
            ]);
            setGuarantors(guaRes.data);
            setTenants(tenRes.data);
        } catch (err) {
            error('Error al cargar garantes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredGuarantors = guarantors.filter(g => {
        const search = searchTerm.toLowerCase();
        return (
            g.first_name.toLowerCase().includes(search) ||
            g.last_name.toLowerCase().includes(search) ||
            g.dni.toLowerCase().includes(search) ||
            g.email.toLowerCase().includes(search)
        );
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingGuarantor) {
                await api.put(`/guarantors/${editingGuarantor.id}`, formData);
                success('Garante actualizado');
            } else {
                await api.post('/guarantors', formData);
                success('Garante registrado');
            }
            setShowModal(false);
            setEditingGuarantor(null);
            setFormData({ first_name: '', last_name: '', dni: '', address: '', whatsapp: '', email: '', tenant_id: '' });
            fetchData();
        } catch (err) {
            error('Error al guardar: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleEdit = (g) => {
        setEditingGuarantor(g);
        setFormData({
            first_name: g.first_name,
            last_name: g.last_name,
            dni: g.dni,
            address: g.address,
            whatsapp: g.whatsapp,
            email: g.email,
            tenant_id: g.tenant_id
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm('¿Eliminar Garante?', '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.');
        if (isConfirmed) {
            try {
                await api.delete(`/guarantors/${id}`);
                success('Garante eliminado');
                fetchData();
            } catch (err) {
                error('No se pudo eliminar el garante');
            }
        }
    };

    return (
        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Garantes</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Administra los respaldos de tus contratos de locación.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="search-wrapper">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar garante..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-orange" onClick={() => { setEditingGuarantor(null); setFormData({ first_name: '', last_name: '', dni: '', address: '', whatsapp: '', email: '', tenant_id: '' }); setShowModal(true); }}>
                        <Plus size={18} /> Nuevo Garante
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Garante</th>
                                <th>DNI / CUIT</th>
                                <th>Contacto</th>
                                <th>Inquilino Asociado</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando datos...</td></tr>
                            ) : filteredGuarantors.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron garantes.</td></tr>
                            ) : filteredGuarantors.map(g => (
                                <tr key={g.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                <Shield size={18} />
                                            </div>
                                            <div style={{ fontWeight: '600' }}>{g.first_name} {g.last_name}</div>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.9rem' }}>{g.dni}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Phone size={12} color="var(--text-muted)" /> {g.whatsapp}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Mail size={12} /> {g.email}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {g.tenant ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <User size={14} color="var(--primary)" />
                                                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{g.tenant.first_name} {g.tenant.last_name}</span>
                                            </div>
                                        ) : (
                                            <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Sin asignar</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleEdit(g)} className="btn" style={{ padding: '0.5rem', background: '#f1f5f9', color: 'var(--secondary)' }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(g.id)} className="btn" style={{ padding: '0.5rem', background: '#fef2f2', color: '#ef4444' }}>
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
                    <div className="card" style={{ width: '100%', maxWidth: '500px', position: 'relative', padding: '2.5rem' }}>
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ marginBottom: '0.25rem' }}>{editingGuarantor ? 'Editar' : 'Nuevo'} Garante</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Registra los datos de la persona que sale como garantía.</p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', gap: '1.25rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label>Nombre</label>
                                    <input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} required placeholder="Ej: Mario" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Apellido</label>
                                    <input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} required placeholder="Ej: Rossi" />
                                </div>
                            </div>

                            <div>
                                <label>DNI / CUIT</label>
                                <input value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} required placeholder="00.000.000" />
                            </div>

                            <div>
                                <label>Dirección</label>
                                <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required placeholder="Calle, Nro, Localidad" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <label>WhatsApp</label>
                                    <input value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} required placeholder="+54 9..." />
                                </div>
                                <div>
                                    <label>Email</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="garante@mail.com" />
                                </div>
                            </div>

                            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={14} color="var(--primary)" /> Inquilino que Garantiza
                                </label>
                                <select value={formData.tenant_id} onChange={e => setFormData({ ...formData, tenant_id: e.target.value })} required style={{ background: '#fff', marginBottom: 0 }}>
                                    <option value="">Seleccione un inquilino...</option>
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.dni})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                                    {editingGuarantor ? 'Guardar Cambios' : 'Registrar Garante'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Guarantors;
