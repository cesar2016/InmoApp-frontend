import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLocation } from 'react-router-dom';
import { Plus, X, Trash2, Search, FileText, Home as HomeIcon, User, Calendar, DollarSign, ArrowRight, Hash, Info, MapPin, Phone, Mail, UserCheck, Upload, Sparkles, CheckCircle2, AlertCircle, Loader2, Copy } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Contracts = () => {
    const { success, error } = useToast();
    const [contracts, setContracts] = useState([]);
    const [properties, setProperties] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showJsonModal, setShowJsonModal] = useState(false);
    const [formData, setFormData] = useState({
        property_id: '',
        tenant_id: '',
        start_date: '',
        end_date: '',
        rent_amount: '',
        increase_frequency_months: '6',
        owner_first_name: '',
        owner_last_name: '',
        owner_dni: '',
        owner_address: '',
        owner_whatsapp: '',
        owner_email: '',
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [propSearch, setPropSearch] = useState('');
    const [tenantSearch, setTenantSearch] = useState('');
    const [ownerSearch, setOwnerSearch] = useState('');
    const [showPropDropdown, setShowPropDropdown] = useState(false);
    const [showTenantDropdown, setShowTenantDropdown] = useState(false);
    const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
    const [uploadMode, setUploadMode] = useState('manual');
    const [isUploading, setIsUploading] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [selectedAiProvider, setSelectedAiProvider] = useState('groq');

    const location = useLocation();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [conRes, propRes, tenRes, ownRes] = await Promise.all([
                api.get('/contracts'),
                api.get('/properties'),
                api.get('/tenants'),
                api.get('/owners')
            ]);
            setContracts(conRes.data);
            // Handle paginated responses: extract .data.data for paginated endpoints
            const propertiesData = propRes.data.data ?? propRes.data;
            const tenantsData = tenRes.data.data ?? tenRes.data;
            const ownersData = ownRes.data.data ?? ownRes.data;
            setProperties(propertiesData.filter(p => !p.is_rented && p.listing_type !== 'Venta'));
            setTenants(tenantsData);
            setOwners(ownersData);
        } catch (err) {
            error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (location.state?.extractedData) {
            setExtractedData(location.state.extractedData);
            setUploadMode('smart');
        }
    }, [location.state]);

    const filteredContracts = contracts.filter(c => {
        const search = searchTerm.toLowerCase();
        const tenantName = `${c.tenant?.first_name} ${c.tenant?.last_name}`.toLowerCase();
        const propAddress = `${c.property?.street} ${c.property?.number}`.toLowerCase();
        return tenantName.includes(search) || propAddress.includes(search);
    });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('provider', selectedAiProvider);

        setIsUploading(true);
        try {
            const res = await api.post('/contracts/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const raw = res.data.data;
            const data = {
                tenant: raw.tenant_data || raw.tenant || {},
                property: raw.property_data || raw.property || {},
                owner: raw.owner_data || raw.owner || {},
                contract: {
                    start_date: raw.contract?.start_date || '',
                    end_date: raw.contract?.end_date || '',
                    rent_amount: raw.contract?.rent_amount || '',
                    increase_frequency_months: raw.contract?.increase_frequency_months || 6
                },
                guarantors: Array.isArray(raw.guarantors) ? raw.guarantors : []
            };
            
            setExtractedData(data);
            
            if (data) {
                const dniToMatch = (data.tenant?.dni || '').replace(/\D/g, '');
                const foundTenant = tenants.find(t => dniToMatch && t.dni.replace(/\D/g, '') === dniToMatch);
                if (foundTenant) {
                    setFormData(prev => ({ ...prev, tenant_id: foundTenant.id }));
                    setTenantSearch(`${foundTenant.first_name} ${foundTenant.last_name}`);
                } else {
                    setTenantSearch(`${data.tenant?.first_name || ''} ${data.tenant?.last_name || ''}`);
                }

                const streetToMatch = (data.property?.street || '').toLowerCase();
                const matchedProp = properties.find(p => streetToMatch && p.street.toLowerCase().includes(streetToMatch));
                if (matchedProp) {
                    setFormData(prev => ({ ...prev, property_id: matchedProp.id }));
                    setPropSearch(`${matchedProp.street} ${matchedProp.number}`);
                } else {
                    setPropSearch(`${data.property?.street || ''} ${data.property?.number || ''}`);
                }
                
                const ownerDni = (data.owner?.dni || '').replace(/\D/g, '');
                const foundOwner = owners.find(o => ownerDni && o.dni.replace(/\D/g, '') === ownerDni);
                if (foundOwner) {
                    setOwnerSearch(`${foundOwner.first_name} ${foundOwner.last_name}`);
                    if (data.property) data.property.owner_id = foundOwner.id;
                } else {
                    setOwnerSearch(`${data.owner?.first_name || ''} ${data.owner?.last_name || ''}`);
                }
            }
            success('Contrato procesado correctamente');
        } catch (err) {
            error('Error al procesar archivo');
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmExtracted = async () => {
        const payload = {
            ...formData,
            start_date: extractedData.contract?.start_date || formData.start_date,
            end_date: extractedData.contract?.end_date || formData.end_date,
            rent_amount: extractedData.contract?.rent_amount || formData.rent_amount,
            increase_frequency_months: extractedData.contract?.increase_frequency_months || formData.increase_frequency_months,
        };

        if (!formData.tenant_id) payload.tenant_data = extractedData.tenant;
        if (!formData.property_id) {
            payload.property_data = extractedData.property;
            payload.owner_data = extractedData.owner;
        }
        if (extractedData.guarantors?.length) payload.guarantors = extractedData.guarantors;

        try {
            await api.post('/contracts', payload);
            success('Contrato registrado con éxito');
            setShowModal(false);
            fetchData();
        } catch (err) {
            error('Error al registrar contrato');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (formData.owner_first_name) {
                payload.owner_data = {
                    first_name: formData.owner_first_name,
                    last_name: formData.owner_last_name,
                    dni: formData.owner_dni,
                    address: formData.owner_address,
                    whatsapp: formData.owner_whatsapp,
                    email: formData.owner_email,
                };
            }
            await api.post('/contracts', payload);
            success('Contrato generado');
            setShowModal(false);
            fetchData();
        } catch (err) {
            error('Error al generar contrato');
        }
    };

    const handleViewFile = async (id) => {
        try {
            const res = await api.get(`/contracts/${id}/file`, { responseType: 'blob' });
            const contentType = res.headers['content-type'] || 'application/pdf';
            const blob = new Blob([res.data], { type: contentType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `contrato_${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            error('Error al descargar archivo');
        }
    };

    return (
        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Contratos</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Historial y gestión de acuerdos de locación activos y finalizados.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="search-wrapper">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar contrato..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-orange" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Nuevo Contrato
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Inmueble</th>
                                <th>Inquilino</th>
                                <th>Vigencia</th>
                                <th>Alquiler</th>
                                <th>Estado</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Cargando contratos...</td></tr>
                            ) : filteredContracts.map(c => (
                                <tr key={c.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <HomeIcon size={18} />
                                            </div>
                                            <div style={{ fontWeight: '600' }}>{c.property.street} {c.property.number}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <User size={14} color="var(--secondary)" />
                                            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{c.tenant?.first_name || 'N/A'} {c.tenant?.last_name || ''}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{c.start_date}</span>
                                            <ArrowRight size={12} color="var(--text-muted)" />
                                            <span style={{ fontWeight: '600' }}>{c.end_date}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                                            ${new Intl.NumberFormat('es-AR').format(c.rent_amount)}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${c.is_active ? 'badge-success' : ''}`} style={{ background: c.is_active ? '' : '#f1f5f9', color: c.is_active ? '' : '#64748b' }}>
                                            {c.is_active ? 'ACTIVO' : 'FINALIZADO'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            {c.file_path && (
                                                <button className="btn" style={{ padding: '0.5rem', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }} onClick={() => handleViewFile(c.id)}>
                                                    <FileText size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '2.5rem' }}>
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <h2 style={{ marginBottom: '2rem' }}>Nuevo Contrato</h2>

                        {/* Premium Tabs */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '12px' }}>
                            <button
                                onClick={() => setUploadMode('manual')}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: uploadMode === 'manual' ? 'white' : 'transparent', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                            >
                                <FileText size={18} /> Carga Manual
                            </button>
                            <button
                                onClick={() => setUploadMode('smart')}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: uploadMode === 'smart' ? 'white' : 'transparent', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                            >
                                <Sparkles size={18} className={uploadMode === 'smart' ? 'text-primary' : ''} /> Carga Inteligente
                            </button>
                        </div>

                        {uploadMode === 'smart' && !extractedData ? (
                            <div className="upload-zone" style={{ border: '2px dashed var(--border)', borderRadius: '1.5rem', padding: '4rem 2rem', textAlign: 'center', background: '#f8fafc' }}>
                                <input type="file" id="up" hidden onChange={handleFileUpload} accept=".pdf,.doc,.docx,.json" />
                                {isUploading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <Loader2 size={40} className="animate-spin text-primary" />
                                        <p style={{ fontWeight: '600' }}>Procesando documento...</p>
                                    </div>
                                ) : (
                                    <label htmlFor="up" style={{ cursor: 'pointer' }}>
                                        <Upload size={48} className="text-primary" style={{ marginBottom: '1rem' }} />
                                        <h3>Subir Contrato o JSON</h3>
                                        <p style={{ color: 'var(--text-muted)' }}>Arrastra tu archivo aquí o haz clic para buscar.</p>
                                    </label>
                                )}
                            </div>
                        ) : extractedData ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    {/* Inquilino Card */}
                                    <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: formData.tenant_id ? 'var(--primary)' : 'var(--secondary)' }}>
                                            <User size={18} /> Inquilino Detectado
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <input type="text" value={`${extractedData.tenant?.first_name || ''} ${extractedData.tenant?.last_name || ''}`} onChange={e => {
                                                const [f, ...l] = e.target.value.split(' ');
                                                setExtractedData({ ...extractedData, tenant: { ...(extractedData.tenant || {}), first_name: f, last_name: l.join(' ') } });
                                            }} />
                                            <input type="text" placeholder="DNI" value={extractedData.tenant?.dni || ''} onChange={e => setExtractedData({ ...extractedData, tenant: { ...(extractedData.tenant || {}), dni: e.target.value } })} />
                                        </div>
                                    </div>

                                    {/* Inmueble Card */}
                                    <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: formData.property_id ? 'var(--primary)' : 'var(--secondary)' }}>
                                            <HomeIcon size={18} /> Inmueble Detectado
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <input type="text" value={`${extractedData.property?.street || ''} ${extractedData.property?.number || ''}`} onChange={e => {
                                                const p = e.target.value.split(' ');
                                                const n = p.pop();
                                                setExtractedData({ ...extractedData, property: { ...(extractedData.property || {}), street: p.join(' '), number: n } });
                                            }} />
                                            <input type="text" placeholder="Localidad" value={extractedData.property?.location || ''} onChange={e => setExtractedData({ ...extractedData, property: { ...(extractedData.property || {}), location: e.target.value } })} />
                                            <input type="text" placeholder="Tipo" value={extractedData.property?.type || ''} onChange={e => setExtractedData({ ...extractedData, property: { ...(extractedData.property || {}), type: e.target.value } })} />
                                        </div>
                                    </div>

                                    {/* Locador Card */}
                                    <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                            <User size={18} /> Locador / Propietario Detectado
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <input type="text" value={`${extractedData.owner?.first_name || ''} ${extractedData.owner?.last_name || ''}`} onChange={e => {
                                                const [f, ...l] = e.target.value.split(' ');
                                                setExtractedData({ ...extractedData, owner: { ...(extractedData.owner || {}), first_name: f, last_name: l.join(' ') } });
                                            }} />
                                            <input type="text" placeholder="DNI" value={extractedData.owner?.dni || ''} onChange={e => setExtractedData({ ...extractedData, owner: { ...(extractedData.owner || {}), dni: e.target.value } })} />
                                            <input type="text" placeholder="Domicilio" value={extractedData.owner?.address || ''} onChange={e => setExtractedData({ ...extractedData, owner: { ...(extractedData.owner || {}), address: e.target.value } })} />
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                <input type="text" placeholder="WhatsApp" value={extractedData.owner?.whatsapp || ''} onChange={e => setExtractedData({ ...extractedData, owner: { ...(extractedData.owner || {}), whatsapp: e.target.value } })} />
                                                <input type="text" placeholder="Email" value={extractedData.owner?.email || ''} onChange={e => setExtractedData({ ...extractedData, owner: { ...(extractedData.owner || {}), email: e.target.value } })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Garantes Card */}
                                <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                        <UserCheck size={18} /> Garantes / Codeudores Detectados
                                    </h4>
                                    {(extractedData.guarantors || []).length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)' }}>No se detectaron garantes en el documento.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {(Array.isArray(extractedData.guarantors) ? extractedData.guarantors : []).map((g, i) => (
                                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                                                    <input type="text" placeholder="Nombre" value={`${g.first_name || ''} ${g.last_name || ''}`} onChange={e => {
                                                        const [f, ...l] = e.target.value.split(' ');
                                                        const next = [...extractedData.guarantors];
                                                        next[i] = { ...g, first_name: f, last_name: l.join(' ') };
                                                        setExtractedData({ ...extractedData, guarantors: next });
                                                    }} />
                                                    <input type="text" placeholder="DNI" value={g.dni || ''} onChange={e => {
                                                        const next = [...extractedData.guarantors];
                                                        next[i] = { ...g, dni: e.target.value };
                                                        setExtractedData({ ...extractedData, guarantors: next });
                                                    }} />
                                                    <input type="text" placeholder="Domicilio" value={g.address || ''} onChange={e => {
                                                        const next = [...extractedData.guarantors];
                                                        next[i] = { ...g, address: e.target.value };
                                                        setExtractedData({ ...extractedData, guarantors: next });
                                                    }} />
                                                    <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }} onClick={() => {
                                                        const next = extractedData.guarantors.filter((_, x) => x !== i);
                                                        setExtractedData({ ...extractedData, guarantors: next });
                                                    }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button type="button" className="btn" style={{ marginTop: '1rem', background: '#f1f5f9' }} onClick={() => {
                                        setExtractedData({ ...extractedData, guarantors: [...(extractedData.guarantors || []), { first_name: '', last_name: '', dni: '', address: '' }] });
                                    }}>
                                        <Plus size={16} style={{ marginRight: '6px' }} /> Agregar Garante
                                    </button>
                                </div>

                                {/* Vincular DB */}
                                <div className="card" style={{ background: '#f8fafc', padding: '1.5rem', border: '1px solid var(--border)' }}>
                                    <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Search size={18} /> Vincular con Base de Datos</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div style={{ position: 'relative' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Buscar Inmueble Existente</label>
                                            <input type="text" value={propSearch} onChange={e => { setPropSearch(e.target.value); setShowPropDropdown(true); }} placeholder="Dirección..." />
                                            {showPropDropdown && propSearch && (
                                                <div className="dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                                                    {properties.filter(p => `${p.street} ${p.number}`.toLowerCase().includes(propSearch.toLowerCase())).map(p => (
                                                        <div key={p.id} onClick={() => { setFormData({ ...formData, property_id: p.id }); setPropSearch(`${p.street} ${p.number}`); setShowPropDropdown(false); }} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>{p.street} {p.number}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Buscar Inquilino Existente</label>
                                            <input type="text" value={tenantSearch} onChange={e => { setTenantSearch(e.target.value); setShowTenantDropdown(true); }} placeholder="Nombre o DNI..." />
                                            {showTenantDropdown && tenantSearch && (
                                                <div className="dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                                                    {tenants.filter(t => `${t.first_name} ${t.last_name}`.toLowerCase().includes(tenantSearch.toLowerCase())).map(t => (
                                                        <div key={t.id} onClick={() => { setFormData({ ...formData, tenant_id: t.id }); setTenantSearch(`${t.first_name} ${t.last_name}`); setShowTenantDropdown(false); }} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>{t.first_name} {t.last_name}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                                    <h4 style={{ marginBottom: '1rem' }}>Detalles del Contrato</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                        <div><label>Inicio</label><input type="date" value={extractedData.contract?.start_date || ''} onChange={e => setExtractedData({ ...extractedData, contract: { ...(extractedData.contract || {}), start_date: e.target.value } })} /></div>
                                        <div><label>Fin</label><input type="date" value={extractedData.contract?.end_date || ''} onChange={e => setExtractedData({ ...extractedData, contract: { ...(extractedData.contract || {}), end_date: e.target.value } })} /></div>
                                        <div><label>Monto</label><input type="text" value={extractedData.contract?.rent_amount || ''} onChange={e => setExtractedData({ ...extractedData, contract: { ...(extractedData.contract || {}), rent_amount: e.target.value } })} /></div>
                                        <div><label>Frecuencia</label><input type="number" value={extractedData.contract?.increase_frequency_months || 6} onChange={e => setExtractedData({ ...extractedData, contract: { ...(extractedData.contract || {}), increase_frequency_months: e.target.value } })} /></div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <button className="btn" style={{ flex: 1, background: '#f1f5f9' }} onClick={() => setExtractedData(null)}>Descartar</button>
                                    <button className="btn" style={{ flex: 1, background: 'var(--secondary)', color: 'white' }} onClick={() => setShowJsonModal(true)}>
                                        <FileText size={16} style={{ marginRight: '6px' }} /> Ver JSON
                                    </button>
                                    <button className="btn btn-primary" style={{ flex: 2, background: 'var(--primary)' }} onClick={handleConfirmExtracted}>Confirmar y Guardar</button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Inmueble</label>
                                        <input type="text" placeholder="Buscar inmueble..." value={propSearch} onChange={(e) => { setPropSearch(e.target.value); setShowPropDropdown(true); }} required />
                                        {showPropDropdown && (
                                            <div className="dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 100, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                                                {properties.filter(p => `${p.street} ${p.number}`.toLowerCase().includes(propSearch.toLowerCase())).map(p => (
                                                    <div key={p.id} onClick={() => { setFormData({ ...formData, property_id: p.id }); setPropSearch(`${p.street} ${p.number}`); setShowPropDropdown(false); }} style={{ padding: '0.75rem', cursor: 'pointer' }}>{p.street} {p.number}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Inquilino</label>
                                        <input type="text" placeholder="Buscar inquilino..." value={tenantSearch} onChange={(e) => { setTenantSearch(e.target.value); setShowTenantDropdown(true); }} required />
                                        {showTenantDropdown && (
                                            <div className="dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 100, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                                                {tenants.filter(t => `${t.first_name} ${t.last_name}`.toLowerCase().includes(tenantSearch.toLowerCase())).map(t => (
                                                    <div key={t.id} onClick={() => { setFormData({ ...formData, tenant_id: t.id }); setTenantSearch(`${t.first_name} ${t.last_name}`); setShowTenantDropdown(false); }} style={{ padding: '0.75rem', cursor: 'pointer' }}>{t.first_name} {t.last_name}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div><label>Fecha Inicio</label><input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required /></div>
                                    <div><label>Fecha Fin</label><input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} required /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div><label>Monto Alquiler ($)</label><input type="number" value={formData.rent_amount} onChange={e => setFormData({ ...formData, rent_amount: e.target.value })} required /></div>
                                    <div><label>Frecuencia de Aumento</label><input type="number" value={formData.increase_frequency_months} onChange={e => setFormData({ ...formData, increase_frequency_months: e.target.value })} required /></div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <h4 style={{ marginBottom: '1rem' }}><UserCheck size={18} /> Datos del Propietario</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <input type="text" placeholder="Nombre" value={formData.owner_first_name} onChange={e => setFormData({ ...formData, owner_first_name: e.target.value })} />
                                        <input type="text" placeholder="Apellido" value={formData.owner_last_name} onChange={e => setFormData({ ...formData, owner_last_name: e.target.value })} />
                                    </div>
                                    <input type="text" placeholder="DNI / CUIT" value={formData.owner_dni} onChange={e => setFormData({ ...formData, owner_dni: e.target.value })} style={{ marginTop: '1rem' }} />
                                    <input type="text" placeholder="Dirección" value={formData.owner_address} onChange={e => setFormData({ ...formData, owner_address: e.target.value })} style={{ marginTop: '1rem' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn" style={{ flex: 2, background: 'var(--secondary)', color: 'white', fontHeight: '600' }}>Generar Contrato</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {showJsonModal && extractedData && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '900px', maxHeight: '85vh', padding: '2.5rem', position: 'relative', overflow: 'auto' }}>
                        <button onClick={() => setShowJsonModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FileText size={24} style={{ color: 'var(--secondary)' }} />
                                    JSON Extraído - Carga Inteligente
                                </h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                    Datos desglosados del contrato procesado automáticamente
                                </p>
                            </div>
                            <button 
                                onClick={() => navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2))}
                                className="btn" 
                                style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Copy size={16} /> Copiar JSON
                            </button>
                        </div>

                        <pre style={{ 
                            background: '#0f172a', 
                            color: '#e2e8f0', 
                            padding: '1.5rem', 
                            borderRadius: '12px', 
                            overflow: 'auto', 
                            maxHeight: '60vh',
                            fontSize: '0.8rem',
                            lineHeight: '1.5',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}>
                            {JSON.stringify(extractedData, null, 2)}
                        </pre>

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowJsonModal(false)} className="btn" style={{ background: 'var(--secondary)', color: 'white', padding: '0.75rem 2.5rem', borderRadius: '12px', fontWeight: '700' }}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contracts;
