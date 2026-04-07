import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X, Search, Home as HomeIcon, MapPin, User, Hash, Info } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const Properties = () => {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProperty, setEditingProperty] = useState(null);
    const [owners, setOwners] = useState([]);
    const [formData, setFormData] = useState({
        type: 'Departamento',
        listing_type: 'Alquiler',
        real_estate_id: '',
        domain: '',
        street: '',
        number: '',
        floor: '',
        apartment: '',
        location: '',
        owner_id: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [propRes, ownRes] = await Promise.all([
                api.get('/properties'),
                api.get('/owners')
            ]);
            setProperties(propRes.data);
            setOwners(ownRes.data);
        } catch (err) {
            error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredProperties = properties.filter(p => {
        const search = searchTerm.toLowerCase();
        return (
            p.street?.toLowerCase().includes(search) ||
            p.number?.toString().includes(search) ||
            p.location?.toLowerCase().includes(search) ||
            p.type?.toLowerCase().includes(search) ||
            p.listing_type?.toLowerCase().includes(search) ||
            p.real_estate_id?.toLowerCase().includes(search) ||
            p.domain?.toLowerCase().includes(search) ||
            p.owner?.first_name?.toLowerCase().includes(search) ||
            p.owner?.last_name?.toLowerCase().includes(search)
        );
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingProperty) {
                await api.put(`/properties/${editingProperty.id}`, formData);
                success('Propiedad actualizada');
            } else {
                await api.post('/properties', formData);
                success('Propiedad registrada');
            }
            setShowModal(false);
            setEditingProperty(null);
            setFormData({ type: 'Departamento', listing_type: 'Alquiler', real_estate_id: '', domain: '', street: '', number: '', floor: '', apartment: '', location: '', owner_id: '' });
            fetchData();
        } catch (err) {
            error('Error al guardar: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleEdit = (p) => {
        setEditingProperty(p);
        setFormData({
            type: p.type,
            listing_type: p.listing_type || 'Alquiler',
            real_estate_id: p.real_estate_id,
            domain: p.domain,
            street: p.street,
            number: p.number,
            floor: p.floor,
            apartment: p.apartment,
            location: p.location,
            owner_id: p.owner_id
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm('¿Eliminar Propiedad?', '¿Estás seguro de que deseas eliminar esta propiedad? Esta acción no se puede deshacer.');
        if (isConfirmed) {
            try {
                await api.delete(`/properties/${id}`);
                success('Propiedad eliminada');
                fetchData();
            } catch (err) {
                error('No se pudo eliminar la propiedad');
            }
        }
    };

    return (
        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Inmuebles</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Catálogo de propiedades disponibles y alquiladas.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="search-wrapper">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar propiedad..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-orange" onClick={() => { setEditingProperty(null); setFormData({ type: 'Departamento', real_estate_id: '', domain: '', street: '', number: '', floor: '', apartment: '', location: '', owner_id: '' }); setShowModal(true); }}>
                        <Plus size={18} /> Nuevo Inmueble
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Dirección</th>
                                <th>Tipo / Operación</th>
                                <th>Estatus</th>
                                <th>Partida / Dominio</th>
                                <th>Propietario</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando datos...</td></tr>
                            ) : filteredProperties.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron propiedades.</td></tr>
                            ) : filteredProperties.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <HomeIcon size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{p.street} {p.number}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={10} /> {p.location} {p.floor ? `- 4º ${p.apartment}` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)', width: 'fit-content' }}>{p.type}</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: p.listing_type === 'Venta' ? '#ef4444' : p.listing_type === 'Ambos' ? '#f59e0b' : '#3b82f6' }}>
                                                {p.listing_type === 'Ambos' ? 'Venta / Alquiler' : p.listing_type}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        {p.is_rented ? (
                                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Alquilado</span>
                                        ) : (
                                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Disponible</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Hash size={12} color="var(--text-muted)" /> {p.real_estate_id}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Info size={12} /> {p.domain}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <User size={14} color="var(--secondary)" />
                                            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{p.owner?.first_name} {p.owner?.last_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleEdit(p)} className="btn" style={{ padding: '0.5rem', background: '#f1f5f9', color: 'var(--secondary)' }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="btn" style={{ padding: '0.5rem', background: '#fef2f2', color: '#ef4444' }}>
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
                    <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '2.5rem' }}>
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ marginBottom: '0.25rem' }}>{editingProperty ? 'Editar' : 'Nuevo'} Inmueble</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Registra los datos catastrales y vincula un propietario.</p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label>Tipo de Propiedad</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} required>
                                        <option value="Departamento">Departamento</option>
                                        <option value="Casa">Casa</option>
                                        <option value="Local">Local</option>
                                        <option value="Cochera">Cochera</option>
                                        <option value="Oficina">Oficina</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Tipo de Operación</label>
                                    <select value={formData.listing_type} onChange={e => setFormData({ ...formData, listing_type: e.target.value })} required>
                                        <option value="Alquiler">En Alquiler</option>
                                        <option value="Venta">En Venta</option>
                                        <option value="Ambos">Venta y Alquiler</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label>Propietario</label>
                                <select value={formData.owner_id} onChange={e => setFormData({ ...formData, owner_id: e.target.value })} required>
                                    <option value="">Seleccione un dueño...</option>
                                    {owners.map(o => (
                                        <option key={o.id} value={o.id}>{o.first_name} {o.last_name} ({o.dni})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label>Calle / Avenida</label>
                                    <input value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} required placeholder="Ej: Av. Santa Fe" />
                                </div>
                                <div>
                                    <label>Número</label>
                                    <input value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} required placeholder="0000" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1.5rem' }}>
                                <div>
                                    <label>Piso</label>
                                    <input value={formData.floor} onChange={e => setFormData({ ...formData, floor: e.target.value })} placeholder="Ej: 4" />
                                </div>
                                <div>
                                    <label>Depto</label>
                                    <input value={formData.apartment} onChange={e => setFormData({ ...formData, apartment: e.target.value })} placeholder="Ej: B" />
                                </div>
                                <div>
                                    <label>Localidad</label>
                                    <input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required placeholder="Ej: Rosario" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                <div>
                                    <label>Partida Inmobiliaria</label>
                                    <input value={formData.real_estate_id} onChange={e => setFormData({ ...formData, real_estate_id: e.target.value })} required placeholder="00-000000-0" style={{ background: 'white' }} />
                                </div>
                                <div>
                                    <label>Dominio</label>
                                    <input value={formData.domain} onChange={e => setFormData({ ...formData, domain: e.target.value })} required placeholder="Matrícula..." style={{ background: 'white' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                                    {editingProperty ? 'Guardar Cambios' : 'Registrar Inmueble'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Properties;
