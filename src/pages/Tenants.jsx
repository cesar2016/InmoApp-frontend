import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X, Search, User, Phone, Mail, Home as HomeIcon, Shield, FileText, History } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import ReceiptModal from '../components/ReceiptModal';

const Tenants = () => {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    const [selectedTenantForReceipt, setSelectedTenantForReceipt] = useState(null);
    const [selectedTenantForHistory, setSelectedTenantForHistory] = useState(null);
    const [tenantPayments, setTenantPayments] = useState([]);
    const [editingTenant, setEditingTenant] = useState(null);
    const [properties, setProperties] = useState([]);
    const [allGuarantors, setAllGuarantors] = useState([]);
    const [guarantorSearch, setGuarantorSearch] = useState('');

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dni: '',
        address: '',
        whatsapp: '',
        email: '',
        property_id: '',
        rent_amount: '',
        start_date: '',
        end_date: '',
        increase_frequency_months: '6',
        guarantor_ids: []
    });

    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tenRes, propRes, guaRes] = await Promise.all([
                api.get('/tenants'),
                api.get('/properties'),
                api.get('/guarantors')
            ]);
            setTenants(tenRes.data);
            setProperties(propRes.data);
            setAllGuarantors(guaRes.data);
        } catch (err) {
            console.error(err);
            error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredTenants = tenants.filter(tenant => {
        const search = searchTerm.toLowerCase();
        const currentProp = tenant.contracts?.find(c => c.is_active)?.property;
        const propAddress = currentProp ? `${currentProp.street} ${currentProp.number}`.toLowerCase() : '';
        return (
            tenant.first_name.toLowerCase().includes(search) ||
            tenant.last_name.toLowerCase().includes(search) ||
            tenant.dni.toLowerCase().includes(search) ||
            tenant.whatsapp.toLowerCase().includes(search) ||
            tenant.email.toLowerCase().includes(search) ||
            propAddress.includes(search)
        );
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSend = { ...formData };
            if (!dataToSend.property_id) dataToSend.property_id = null;
            if (!dataToSend.rent_amount) dataToSend.rent_amount = null;
            if (!dataToSend.start_date) dataToSend.start_date = null;
            if (!dataToSend.end_date) dataToSend.end_date = null;

            if (editingTenant) {
                await api.put(`/tenants/${editingTenant.id}`, dataToSend);
                success('Inquilino actualizado con éxito');
            } else {
                await api.post('/tenants', dataToSend);
                success('Inquilino registrado con éxito');
            }
            setShowModal(false);
            setEditingTenant(null);
            setFormData({
                first_name: '', last_name: '', dni: '', address: '', whatsapp: '', email: '',
                property_id: '', rent_amount: '', start_date: '', end_date: '', increase_frequency_months: '6',
                guarantor_ids: []
            });
            fetchData();
        } catch (err) {
            error('Error al guardar: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleEdit = (tenant) => {
        setEditingTenant(tenant);
        const activeContract = tenant.contracts?.find(c => c.is_active);
        setFormData({
            first_name: tenant.first_name,
            last_name: tenant.last_name,
            dni: tenant.dni,
            address: tenant.address,
            whatsapp: tenant.whatsapp,
            email: tenant.email,
            property_id: activeContract?.property_id || '',
            rent_amount: activeContract?.rent_amount || '',
            start_date: activeContract?.start_date || '',
            end_date: activeContract?.end_date || '',
            increase_frequency_months: activeContract?.increase_frequency_months || '6',
            guarantor_ids: tenant.guarantors?.map(g => g.id) || []
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm('¿Eliminar Inquilino?', '¿Estás seguro de que deseas eliminar este inquilino? Esta acción no se puede deshacer.');
        if (isConfirmed) {
            try {
                await api.delete(`/tenants/${id}`);
                success('Inquilino eliminado');
                fetchData();
            } catch (err) {
                error('No se pudo eliminar el inquilino');
            }
        }
    };

    const handleReceipt = (tenant) => {
        setSelectedTenantForReceipt(tenant);
        setShowReceiptModal(true);
    };

    const handleHistory = async (tenant) => {
        setSelectedTenantForHistory(tenant);
        setTenantPayments([]);
        setHistorySearchTerm('');
        setShowHistoryModal(true);
        try {
            const res = await api.get('/payments');
            let tp = res.data.filter(p => p.contract?.tenant_id === tenant.id || p.contract?.tenant?.id === tenant.id);
            
            // Sort ascending to compute receipt numbers accurately per contract
            tp.sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
            
            const seqByContract = {};
            tp.forEach(p => {
                const cid = p.contract_id;
                if (!seqByContract[cid]) seqByContract[cid] = 1;
                p.computed_receipt_number = seqByContract[cid]++;
                
                if (p.contract && p.contract.start_date && p.contract.end_date) {
                    const sDate = new Date(p.contract.start_date);
                    const eDate = new Date(p.contract.end_date);
                    const ms = (eDate.getFullYear() - sDate.getFullYear()) * 12 + (eDate.getMonth() - sDate.getMonth());
                    p.total_months = ms > 0 ? ms : '-';
                }
            });

            // Re-sort descending by date, and then by id as fallback for newest to oldest
            tp.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date) || b.id - a.id);
            setTenantPayments(tp);
        } catch (err) {
            error('Error al cargar historial de pagos');
        }
    };

    const toggleGuarantor = (id) => {
        const current = [...formData.guarantor_ids];
        const index = current.indexOf(id);
        if (index > -1) current.splice(index, 1);
        else current.push(id);
        setFormData({ ...formData, guarantor_ids: current });
    };

    const filteredGuarantorsForSelect = allGuarantors.filter(g => {
        const s = guarantorSearch.toLowerCase();
        return g.first_name.toLowerCase().includes(s) || g.last_name.toLowerCase().includes(s) || g.dni.toLowerCase().includes(s);
    });

    return (
        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Inquilinos</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Gestiona la información de tus clientes y sus alquileres.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="search-wrapper">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar inquilino..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-orange" onClick={() => { setEditingTenant(null); setShowModal(true); }}>
                        <Plus size={18} /> Nuevo Inquilino
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Inquilino</th>
                                <th>Contacto</th>
                                <th>DNI / CUIT</th>
                                <th>Inmueble Actual</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando datos...</td></tr>
                            ) : filteredTenants.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron inquilinos.</td></tr>
                            ) : filteredTenants.map(tenant => {
                                const activeContract = tenant.contracts?.find(c => c.is_active);
                                return (
                                    <tr key={tenant.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                    {tenant.first_name[0]}{tenant.last_name[0]}
                                                </div>
                                                <div style={{ fontWeight: '600' }}>{tenant.first_name} {tenant.last_name}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Phone size={12} color="var(--text-muted)" /> {tenant.whatsapp}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Mail size={12} /> {tenant.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.9rem' }}>{tenant.dni}</td>
                                        <td>
                                            {activeContract ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ padding: '4px', background: '#ecfdf5', borderRadius: '4px', color: '#059669' }}>
                                                        <HomeIcon size={14} />
                                                    </div>
                                                    <span style={{ fontSize: '0.9rem' }}>{activeContract.property.street} {activeContract.property.number}</span>
                                                </div>
                                            ) : (
                                                <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Sin Alquiler</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleReceipt(tenant)} className="btn" style={{ padding: '0.5rem', background: '#ecfdf5', color: '#059669' }} title="Generar Recibo">
                                                    <FileText size={16} />
                                                </button>
                                                <button onClick={() => handleHistory(tenant)} className="btn" style={{ padding: '0.5rem', background: '#e0f2fe', color: '#0284c7' }} title="Ver Historial de Pagos">
                                                    <History size={16} />
                                                </button>
                                                <button onClick={() => handleEdit(tenant)} className="btn" style={{ padding: '0.5rem', background: '#f1f5f9', color: 'var(--secondary)' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(tenant.id)} className="btn" style={{ padding: '0.5rem', background: '#fef2f2', color: '#ef4444' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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

                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ marginBottom: '0.25rem' }}>{editingTenant ? 'Editar' : 'Nuevo'} Inquilino</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Completa los datos del inquilino y su contrato actual.</p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <label>Nombre</label>
                                    <input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} required placeholder="Ej: Juan" />
                                </div>
                                <div>
                                    <label>Apellido</label>
                                    <input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} required placeholder="Ej: Pérez" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <label>DNI / CUIT</label>
                                    <input value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} required placeholder="00.000.000" />
                                </div>
                                <div>
                                    <label>WhatsApp</label>
                                    <input value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} required placeholder="+54 9..." />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <label>Email</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="usuario@mail.com" />
                                </div>
                                <div>
                                    <label>Dirección Personal</label>
                                    <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required placeholder="Calle, Nro, Localidad" />
                                </div>
                            </div>

                            {/* Sección Garantes */}
                            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Shield size={18} color="var(--secondary)" />
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Garantes</h3>
                                </div>

                                <div className="search-wrapper" style={{ maxWidth: '100%', marginBottom: '1rem' }}>
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre o DNI..."
                                        value={guarantorSearch}
                                        onChange={e => setGuarantorSearch(e.target.value)}
                                        style={{ background: '#fff' }}
                                    />
                                </div>

                                <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#fff', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '0.5rem' }}>
                                    {filteredGuarantorsForSelect.map(g => (
                                        <div key={g.id}
                                            onClick={() => toggleGuarantor(g.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.6rem 0.75rem',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                                background: formData.guarantor_ids.includes(g.id) ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{
                                                width: '18px', height: '18px', border: '2px solid var(--secondary)', borderRadius: '4px',
                                                background: formData.guarantor_ids.includes(g.id) ? 'var(--secondary)' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {formData.guarantor_ids.includes(g.id) && <X size={14} color="white" />}
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: formData.guarantor_ids.includes(g.id) ? '600' : '400' }}>
                                                {g.first_name} {g.last_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({g.dni})</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sección Alquiler */}
                            <div style={{ padding: '1.5rem', background: '#fff7f2', borderRadius: '1rem', border: '1px solid #fed7aa' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <HomeIcon size={18} color="var(--primary)" />
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Contrato de Alquiler</h3>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label>Inmueble a Ocupar</label>
                                        <select value={formData.property_id} onChange={e => setFormData({ ...formData, property_id: e.target.value })} style={{ background: '#fff' }}>
                                            <option value="">Ninguno / Sin asignar</option>
                                            {properties.map(p => (
                                                <option key={p.id} value={p.id}>{p.street} {p.number} ({p.type})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Monto Mensual ($)</label>
                                        <input type="number" value={formData.rent_amount} onChange={e => setFormData({ ...formData, rent_amount: e.target.value })} required={!!formData.property_id} style={{ background: '#fff' }} placeholder="0.00" />
                                    </div>
                                </div>

                                {formData.property_id && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem', animation: 'slideIn 0.3s ease-out' }}>
                                        <div>
                                            <label>Fecha Inicio</label>
                                            <input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required style={{ background: '#fff' }} />
                                        </div>
                                        <div>
                                            <label>Fecha Fin</label>
                                            <input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} required style={{ background: '#fff' }} />
                                        </div>
                                        <div>
                                            <label>Aumento cada (meses)</label>
                                            <input type="number" value={formData.increase_frequency_months} onChange={e => setFormData({ ...formData, increase_frequency_months: e.target.value })} required style={{ background: '#fff' }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                                    {editingTenant ? 'Guardar Cambios' : 'Registrar Inquilino'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showReceiptModal && (
                <ReceiptModal
                    isOpen={showReceiptModal}
                    onClose={() => setShowReceiptModal(false)}
                    tenant={selectedTenantForReceipt}
                    onSave={() => fetchData()}
                />
            )}

            {showHistoryModal && selectedTenantForHistory && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '2.5rem' }}>
                        <button onClick={() => setShowHistoryModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', paddingRight: '2rem' }}>
                            <div>
                                <h2 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History className="text-primary" /> Historial de Pagos
                                </h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Todos los cobros registrados para <strong>{selectedTenantForHistory.first_name} {selectedTenantForHistory.last_name}</strong>.
                                </p>
                            </div>
                            <div className="search-wrapper" style={{ width: '300px' }}>
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar en historial..."
                                    value={historySearchTerm}
                                    onChange={e => setHistorySearchTerm(e.target.value)}
                                    style={{ background: '#f1f5f9' }}
                                />
                            </div>
                        </div>
                        
                        <div className="table-container" style={{ background: '#f8fafc', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                            <table style={{ background: 'transparent' }}>
                                <thead>
                                    <tr>
                                        <th>Fecha Cobro</th>
                                        <th>Periodo</th>
                                        <th>N° Recibo</th>
                                        <th>Detalle</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                                        
                                        const filteredHistory = tenantPayments.filter(p => {
                                            if (!historySearchTerm) return true;
                                            const s = historySearchTerm.toLowerCase();
                                            const dateStr = new Date(p.payment_date).toLocaleDateString().toLowerCase();
                                            const mName = (monthNames[parseInt(p.period_month, 10) - 1] || p.period_month).toLowerCase();
                                            const periodStr = `${mName}/${p.period_year}`.toLowerCase();
                                            const detailStr = (p.detail || 'Alquiler Mensual').toLowerCase();
                                            const noteStr = (p.note || '').toLowerCase();
                                            const totalStr = p.total?.toString() || p.amount?.toString() || '';
                                            return dateStr.includes(s) || periodStr.includes(s) || detailStr.includes(s) || noteStr.includes(s) || totalStr.includes(s);
                                        });

                                        if (filteredHistory.length === 0) {
                                            return <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron pagos con esos criterios.</td></tr>;
                                        }

                                        return filteredHistory.map(p => {
                                            const monthName = monthNames[parseInt(p.period_month, 10) - 1] || p.period_month;
                                            return (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ verticalAlign: 'top', paddingTop: '1rem' }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                                                <td style={{ fontWeight: '500', textTransform: 'capitalize', verticalAlign: 'top', paddingTop: '1rem' }}>{monthName}/{p.period_year}</td>
                                                <td style={{ verticalAlign: 'top', paddingTop: '1rem' }}>
                                                    <span className="badge" style={{ background: 'white', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
                                                        {p.computed_receipt_number} {p.total_months && p.total_months !== '-' ? `de ${p.total_months}` : ''}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.9rem', color: '#334155', verticalAlign: 'top', paddingTop: '1rem', paddingBottom: '1rem' }}>
                                                    <strong>{p.detail || 'Alquiler Mensual'}</strong>
                                                    {p.note && (
                                                        <div style={{ marginTop: '6px', whiteSpace: 'pre-line', fontSize: '0.85rem', color: '#64748b' }}>
                                                            {p.note}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: '700', color: '#16a34a', verticalAlign: 'top', paddingTop: '1rem' }}>
                                                    ${new Intl.NumberFormat('es-AR').format(p.total || p.amount)}
                                                </td>
                                            </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={() => setShowHistoryModal(false)}>Cerrar Historial</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tenants;
