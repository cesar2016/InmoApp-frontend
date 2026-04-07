import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Eye, X, Trash2, Search, FileText, Home as HomeIcon, User, Calendar, DollarSign, ArrowRight, Hash, Info, MapPin, Phone, Mail, UserCheck, Upload, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Contracts = () => {
    const { success, error } = useToast();
    const [contracts, setContracts] = useState([]);
    const [properties, setProperties] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);
    const [formData, setFormData] = useState({
        property_id: '',
        tenant_id: '',
        start_date: '',
        end_date: '',
        rent_amount: '',
        increase_frequency_months: '6'
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
            // Only available properties for rent
            setProperties(propRes.data.filter(p => !p.is_rented && p.listing_type !== 'Venta'));
            setTenants(tenRes.data);
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

    const filteredContracts = contracts.filter(c => {
        const search = searchTerm.toLowerCase();
        const tenantName = `${c.tenant?.first_name} ${c.tenant?.last_name}`.toLowerCase();
        const propAddress = `${c.property?.street} ${c.property?.number}`.toLowerCase();
        return (
            tenantName.includes(search) ||
            propAddress.includes(search) ||
            c.start_date.toLowerCase().includes(search) ||
            c.end_date.toLowerCase().includes(search) ||
            c.rent_amount.toString().includes(search)
        );
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/contracts', formData);
            success('Contrato generado con éxito');
            setShowModal(false);
            setPropSearch('');
            setTenantSearch('');
            fetchData();
        } catch (err) {
            error('Error al crear el contrato');
        }
    };

    const handleOpenModal = () => {
        setFormData({
            property_id: '',
            tenant_id: '',
            start_date: '',
            end_date: '',
            rent_amount: '',
            increase_frequency_months: '6'
        });
        setPropSearch('');
        setTenantSearch('');
        setUploadMode('manual');
        setExtractedData(null);
        setShowModal(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        setIsUploading(true);
        try {
            const res = await api.post('/contracts/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const data = res.data.data;
            setExtractedData(data);

            // Auto-match logic immediately after extraction
            if (data) {
                const streetToMatch = (data.property?.street || '').toLowerCase()
                    .replace(/^(calle|av|avenida|pje|pasaje)\s+/i, '')
                    .trim();
                const numberToMatch = (data.property?.number || '').toString().trim();

                const matchedProp = properties.find(p => {
                    const dbStreet = p.street.toLowerCase().replace(/^(calle|av|avenida|pje|pasaje)\s+/i, '').trim();
                    return dbStreet.includes(streetToMatch) && p.number.toString().includes(numberToMatch) && streetToMatch.length > 2;
                });

                if (matchedProp) {
                    setFormData(prev => ({ ...prev, property_id: matchedProp.id }));
                    setPropSearch(`${matchedProp.street} ${matchedProp.number} (${matchedProp.type})`);
                } else {
                    setPropSearch(`${data.property?.street || ''} ${data.property?.number || ''}`);
                }

                const dniToMatch = (data.tenant?.dni || '').replace(/\D/g, '');
                const nameToMatch = (data.tenant?.first_name || '').toLowerCase();
                const matchedTenant = tenants.find(t =>
                    (dniToMatch && t.dni.replace(/\D/g, '').includes(dniToMatch)) ||
                    (nameToMatch && `${t.first_name} ${t.last_name}`.toLowerCase().includes(nameToMatch))
                );
                if (matchedTenant) {
                    setFormData(prev => ({ ...prev, tenant_id: matchedTenant.id }));
                    setTenantSearch(`${matchedTenant.first_name} ${matchedTenant.last_name}`);
                } else {
                    setTenantSearch(`${data.tenant?.first_name || ''} ${data.tenant?.last_name || ''}`);
                }

                const ownerDniToMatch = (data.owner?.dni || '').replace(/\D/g, '');
                const ownerNameToMatch = (data.owner?.first_name || '').toLowerCase();
                const matchedOwner = owners.find(o =>
                    (ownerDniToMatch && o.dni.replace(/\D/g, '').includes(ownerDniToMatch)) ||
                    (ownerNameToMatch && `${o.first_name} ${o.last_name}`.toLowerCase().includes(ownerNameToMatch))
                );
                if (matchedOwner) {
                    // Pre-fill owner_id in extractedData.property if it's new
                    data.property.owner_id = matchedOwner.id;
                    setOwnerSearch(`${matchedOwner.first_name} ${matchedOwner.last_name}`);
                } else {
                    setOwnerSearch(`${data.owner?.first_name || ''} ${data.owner?.last_name || ''}`);
                }

                // Pre-fill dates and amount into formData as well to keep them in sync
                setFormData(prev => ({
                    ...prev,
                    start_date: data.contract?.start_date || prev.start_date,
                    end_date: data.contract?.end_date || prev.end_date,
                    rent_amount: (data.contract?.rent_amount || '').toString().replace(/[^0-9]/g, '') || prev.rent_amount,
                    temp_file: data.temp_file || '', // Store the temp file path
                }));
            }

            success('Contrato procesado con éxito');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Error al procesar el archivo';
            error(errorMsg);
            console.error('Upload Error:', err.response?.data);
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmExtracted = async (e) => {
        if (e) e.preventDefault();

        // Ensure all required fields are in formData
        const cleanAmount = (extractedData.contract?.rent_amount || '').toString().replace(/[^0-9]/g, '');
        const payload = {
            ...formData,
            start_date: extractedData.contract?.start_date || formData.start_date,
            end_date: extractedData.contract?.end_date || formData.end_date,
            rent_amount: cleanAmount || formData.rent_amount,
            increase_frequency_months: extractedData.contract?.increase_frequency_months || formData.increase_frequency_months,
        };

        // If creating new entities, include their data
        if (!formData.tenant_id) {
            payload.tenant_data = extractedData.tenant;
        }
        if (!formData.property_id) {
            payload.property_data = extractedData.property;
            payload.owner_data = extractedData.owner;
        }

        if ((!payload.property_id && !payload.tenant_id && !payload.tenant_data && !payload.property_data) || !payload.start_date || !payload.rent_amount) {
            error('Por favor vincula o crea un inmueble e inquilino antes de finalizar.');
            return;
        }

        try {
            await api.post('/contracts', payload);
            success('Contrato registrado con éxito');
            setShowModal(false);
            setPropSearch('');
            setTenantSearch('');
            fetchData();
        } catch (err) {
            error('Error al registrar el contrato');
            console.error('Save Error:', err.response?.data);
        }
    };

    const handleViewFile = async (contractId) => {
        try {
            const res = await api.get(`/contracts/${contractId}/file`, { responseType: 'blob' });
            const contentType = res.headers['content-type'] || 'application/octet-stream';
            const fileBlob = new Blob([res.data], { type: contentType });
            const fileUrl = URL.createObjectURL(fileBlob);
            
            const link = document.createElement('a');
            link.href = fileUrl;
            link.target = '_blank';
            link.download = `contrato_${contractId}`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        } catch (err) {
            error('Error al abrir el documento');
            console.error(err);
        }
    };

    const handleViewDetail = (contract) => {
        setSelectedContract(contract);
        setShowDetailModal(true);
    };

    return (
        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
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
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-orange" onClick={handleOpenModal}>
                        <Plus size={18} /> Nuevo Contrato
                    </button>
                </div>
            </div>

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
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando contratos...</td></tr>
                            ) : filteredContracts.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron contratos.</td></tr>
                            ) : filteredContracts.map(contract => (
                                <tr key={contract.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <HomeIcon size={18} />
                                            </div>
                                            <div style={{ fontWeight: '600' }}>{contract.property.street} {contract.property.number}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <User size={14} color="var(--secondary)" />
                                            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{contract.tenant.first_name} {contract.tenant.last_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{contract.start_date}</span>
                                            <ArrowRight size={12} color="var(--text-muted)" />
                                            <span style={{ fontWeight: '600' }}>{contract.end_date}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                            ${new Intl.NumberFormat('es-AR').format(contract.rent_amount)}
                                        </div>
                                    </td>
                                    <td>
                                        {contract.is_active ? (
                                            <span className="badge badge-success">Activo</span>
                                        ) : (
                                            <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Finalizado</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            {contract.file_path && (
                                                <button
                                                    className="btn"
                                                    style={{ padding: '0.5rem', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }}
                                                    onClick={() => handleViewFile(contract.id)}
                                                    title="Ver documento original"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            )}
                                            <button
                                                className="btn"
                                                style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)' }}
                                                onClick={() => handleViewDetail(contract)}
                                                title="Ver detalles"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedContract && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '2.5rem' }}>
                        <button onClick={() => setShowDetailModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                    <FileText size={24} className="text-secondary" />
                                    <h2 style={{ margin: 0 }}>Detalle de Contrato</h2>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Información completa sobre el acuerdo de locación.</p>
                            </div>
                            <div className={`badge ${selectedContract.is_active ? 'badge-success' : ''}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                                {selectedContract.is_active ? 'Contrato Activo' : 'Finalizado'}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                            <div className="detail-section">
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)' }}>
                                    <Calendar size={18} /> Vigencia y Montos
                                </h3>
                                <div className="card" style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '1.25rem', gap: '1rem', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Fecha Inicio:</span>
                                        <span style={{ fontWeight: '600' }}>{selectedContract.start_date}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Fecha Fin:</span>
                                        <span style={{ fontWeight: '600' }}>{selectedContract.end_date}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Alquiler Actual:</span>
                                        <span style={{ fontWeight: '800', fontSize: '1.25rem', color: 'var(--text-main)' }}>
                                            ${new Intl.NumberFormat('es-AR').format(selectedContract.rent_amount)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Frec. de Aumento:</span>
                                        <span style={{ fontWeight: '600' }}>Cada {selectedContract.increase_frequency_months} meses</span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)' }}>
                                    <HomeIcon size={18} /> Inmueble
                                </h3>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <HomeIcon size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{selectedContract.property.street} {selectedContract.property.number}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={14} /> {selectedContract.property.location}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowDetailModal(false)} className="btn btn-primary">Cerrar Detalles</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '2.5rem' }}>
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ marginBottom: '0.25rem' }}>Nuevo Contrato</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Vincula un inquilino con una propiedad disponible.</p>
                        </div>

                        {!extractedData && (
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '12px' }}>
                                <button
                                    onClick={() => setUploadMode('manual')}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: uploadMode === 'manual' ? 'white' : 'transparent', fontWeight: '600', color: uploadMode === 'manual' ? 'black' : 'gray', cursor: 'pointer' }}
                                >
                                    <FileText size={18} /> Carga Manual
                                </button>
                                <button
                                    onClick={() => setUploadMode('smart')}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: uploadMode === 'smart' ? 'white' : 'transparent', fontWeight: '600', color: uploadMode === 'smart' ? 'var(--primary)' : 'gray', cursor: 'pointer' }}
                                >
                                    <Sparkles size={18} /> Carga Inteligente
                                </button>
                            </div>
                        )}

                        {uploadMode === 'smart' && !extractedData ? (
                            <div className="upload-zone" style={{ border: '2px dashed var(--border)', borderRadius: '1.5rem', padding: '4rem 2rem', textAlign: 'center', background: '#f8fafc', transition: 'all 0.3s' }}>
                                <input
                                    type="file"
                                    id="contract-upload"
                                    hidden
                                    onChange={handleFileUpload}
                                    accept=".pdf,.doc,.docx"
                                />
                                {isUploading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <Loader2 size={48} className="text-primary animate-spin" />
                                        <p style={{ fontWeight: '600' }}>Procesando documento...</p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Extrayendo datos de propietarios, inquilinos y propiedad.</p>
                                    </div>
                                ) : (
                                    <label htmlFor="contract-upload" style={{ cursor: 'pointer', display: 'block' }}>
                                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: 'var(--shadow-md)' }}>
                                            <Upload size={32} className="text-primary" />
                                        </div>
                                        <h3 style={{ marginBottom: '0.5rem' }}>Sube el contrato de locación</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                                            Arrastra el archivo o haz clic para subirlo. Soportamos PDF y Word.
                                        </p>
                                    </label>
                                )}
                            </div>
                        ) : extractedData ? (
                            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem', padding: '1rem', background: 'rgba(22, 163, 74, 0.1)', borderRadius: '12px', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
                                    <CheckCircle2 size={24} className="text-success" />
                                    <div>
                                        <div style={{ fontWeight: '700', color: '#166534' }}>¡Documento analizado con éxito!</div>
                                        <div style={{ fontSize: '0.85rem', color: '#166534' }}>Revisa la información extraída y confirma para completar el registro.</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                    {/* Extracted Tenant */}
                                    {(() => {
                                        const linkedTenant = formData.tenant_id ? tenants.find(t => t.id == formData.tenant_id) : null;
                                        const displayTenant = linkedTenant ? {
                                            first_name: linkedTenant.first_name,
                                            last_name: linkedTenant.last_name,
                                            dni: linkedTenant.dni,
                                            whatsapp: linkedTenant.whatsapp,
                                            email: linkedTenant.email,
                                            address: linkedTenant.address
                                        } : extractedData.tenant;

                                        return (
                                            <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', background: linkedTenant ? 'rgba(239, 246, 255, 0.5)' : 'white' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: linkedTenant ? 'var(--primary)' : 'var(--secondary)' }}>
                                                    {linkedTenant ? <UserCheck size={18} /> : <User size={18} />}
                                                    {linkedTenant ? 'Inquilino Vinculado' : 'Inquilino Detectado'}
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Nombre Completo</span>
                                                        <input
                                                            type="text"
                                                            value={`${displayTenant.first_name || ''} ${displayTenant.last_name || ''}`}
                                                            disabled={!!linkedTenant}
                                                            onChange={e => {
                                                                const [first, ...rest] = e.target.value.split(' ');
                                                                setExtractedData({
                                                                    ...extractedData,
                                                                    tenant: { ...extractedData.tenant, first_name: first, last_name: rest.join(' ') }
                                                                });
                                                            }}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedTenant ? '#f8fafc' : 'white' }}
                                                        />
                                                    </div>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>DNI</span>
                                                        <input
                                                            type="text"
                                                            value={displayTenant.dni || ''}
                                                            disabled={!!linkedTenant}
                                                            onChange={e => setExtractedData({
                                                                ...extractedData,
                                                                tenant: { ...extractedData.tenant, dni: e.target.value }
                                                            })}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedTenant ? '#f8fafc' : 'white' }}
                                                            placeholder="No detectado"
                                                        />
                                                    </div>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>WhatsApp</span>
                                                        <input
                                                            type="text"
                                                            value={displayTenant.whatsapp || ''}
                                                            disabled={!!linkedTenant}
                                                            onChange={e => setExtractedData({
                                                                ...extractedData,
                                                                tenant: { ...extractedData.tenant, whatsapp: e.target.value }
                                                            })}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedTenant ? '#f8fafc' : 'white' }}
                                                            placeholder="No detectado"
                                                        />
                                                    </div>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Email</span>
                                                        <input
                                                            type="text"
                                                            value={displayTenant.email || ''}
                                                            disabled={!!linkedTenant}
                                                            onChange={e => setExtractedData({
                                                                ...extractedData,
                                                                tenant: { ...extractedData.tenant, email: e.target.value }
                                                            })}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedTenant ? '#f8fafc' : 'white' }}
                                                            placeholder="No detectado"
                                                        />
                                                    </div>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Domicilio Personal</span>
                                                        <input
                                                            type="text"
                                                            value={displayTenant.address || ''}
                                                            disabled={!!linkedTenant}
                                                            onChange={e => setExtractedData({
                                                                ...extractedData,
                                                                tenant: { ...extractedData.tenant, address: e.target.value }
                                                            })}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedTenant ? '#f8fafc' : 'white' }}
                                                            placeholder="No detectado"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Extracted Property */}
                                    {(() => {
                                        const linkedProp = formData.property_id ? properties.find(p => p.id == formData.property_id) : null;
                                        const displayProp = linkedProp ? {
                                            street: linkedProp.street,
                                            number: linkedProp.number,
                                            location: linkedProp.location
                                        } : extractedData.property;

                                        return (
                                            <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', background: linkedProp ? 'rgba(239, 246, 255, 0.5)' : 'white' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: linkedProp ? 'var(--primary)' : 'var(--secondary)' }}>
                                                    <HomeIcon size={18} /> {linkedProp ? 'Inmueble Vinculado' : 'Inmueble Detectado'}
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Dirección</span>
                                                        <input
                                                            type="text"
                                                            value={`${displayProp.street || ''} ${displayProp.number || ''}`}
                                                            disabled={!!linkedProp}
                                                            onChange={e => {
                                                                const parts = e.target.value.split(' ');
                                                                const num = parts.pop();
                                                                setExtractedData({
                                                                    ...extractedData,
                                                                    property: { ...extractedData.property, street: parts.join(' '), number: num }
                                                                });
                                                            }}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedProp ? '#f8fafc' : 'white' }}
                                                        />
                                                    </div>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Localidad</span>
                                                        <input
                                                            type="text"
                                                            value={displayProp.location || ''}
                                                            disabled={!!linkedProp}
                                                            onChange={e => setExtractedData({
                                                                ...extractedData,
                                                                property: { ...extractedData.property, location: e.target.value }
                                                            })}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedProp ? '#f8fafc' : 'white' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Extracted Owner */}
                                    {(() => {
                                        const linkedProp = formData.property_id ? properties.find(p => p.id == formData.property_id) : null;
                                        const ownerId = linkedProp ? linkedProp.owner_id : extractedData.property.owner_id;
                                        const linkedOwner = ownerId ? owners.find(o => o.id == ownerId) : null;

                                        const displayOwner = linkedOwner ? {
                                            first_name: linkedOwner.first_name,
                                            last_name: linkedOwner.last_name,
                                            dni: linkedOwner.dni,
                                            whatsapp: linkedOwner.whatsapp,
                                            email: linkedOwner.email,
                                            address: linkedOwner.address
                                        } : extractedData.owner;

                                        return (
                                            <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', background: linkedOwner ? 'rgba(239, 246, 255, 0.5)' : 'white' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: linkedOwner ? 'var(--primary)' : 'var(--secondary)' }}>
                                                    {linkedOwner ? <UserCheck size={18} /> : <User size={18} />}
                                                    {linkedOwner ? 'Propietario Vinculado' : 'Propietario Detectado'}
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Nombre Completo</span>
                                                        <input
                                                            type="text"
                                                            value={`${displayOwner.first_name || ''} ${displayOwner.last_name || ''}`}
                                                            disabled={!!linkedOwner}
                                                            onChange={e => {
                                                                const [first, ...rest] = e.target.value.split(' ');
                                                                setExtractedData({
                                                                    ...extractedData,
                                                                    owner: { ...extractedData.owner, first_name: first, last_name: rest.join(' ') }
                                                                });
                                                            }}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedOwner ? '#f8fafc' : 'white' }}
                                                        />
                                                    </div>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>DNI</span>
                                                        <input
                                                            type="text"
                                                            value={displayOwner.dni || ''}
                                                            disabled={!!linkedOwner}
                                                            onChange={e => setExtractedData({
                                                                ...extractedData,
                                                                owner: { ...extractedData.owner, dni: e.target.value }
                                                            })}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedOwner ? '#f8fafc' : 'white' }}
                                                            placeholder="No detectado"
                                                        />
                                                    </div>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>WhatsApp</span>
                                                        <input
                                                            type="text"
                                                            value={displayOwner.whatsapp || ''}
                                                            disabled={!!linkedOwner}
                                                            onChange={e => setExtractedData({
                                                                ...extractedData,
                                                                owner: { ...extractedData.owner, whatsapp: e.target.value }
                                                            })}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedOwner ? '#f8fafc' : 'white' }}
                                                            placeholder="No detectado"
                                                        />
                                                    </div>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Email</span>
                                                        <input
                                                            type="text"
                                                            value={displayOwner.email || ''}
                                                            disabled={!!linkedOwner}
                                                            onChange={e => setExtractedData({
                                                                ...extractedData,
                                                                owner: { ...extractedData.owner, email: e.target.value }
                                                            })}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedOwner ? '#f8fafc' : 'white' }}
                                                            placeholder="No detectado"
                                                        />
                                                    </div>
                                                    <div className="info-row">
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Domicilio Personal</span>
                                                        <input
                                                            type="text"
                                                            value={displayOwner.address || ''}
                                                            disabled={!!linkedOwner}
                                                            onChange={e => setExtractedData({
                                                                ...extractedData,
                                                                owner: { ...extractedData.owner, address: e.target.value }
                                                            })}
                                                            style={{ fontSize: '0.9rem', marginBottom: 0, background: linkedOwner ? '#f8fafc' : 'white' }}
                                                            placeholder="No detectado"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Extracted Owner */}
                                    <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--secondary)' }}>
                                            <Search size={18} /> Vincular Entidades
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Seleccionar Inmueble</span>
                                                    {!formData.property_id ? (
                                                        <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(22, 163, 74, 0.1)', color: '#166534', border: 'none' }}>Automático (Extraído)</span>
                                                    ) : (
                                                        <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: 'none' }}>Vinculado</span>
                                                    )}
                                                </div>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar inmueble..."
                                                        value={propSearch}
                                                        disabled={!!extractedData}
                                                        onChange={e => {
                                                            setPropSearch(e.target.value);
                                                            setShowPropDropdown(true);
                                                        }}
                                                        style={{ marginBottom: 0, background: extractedData ? '#f8fafc' : 'white' }}
                                                    />
                                                    {showPropDropdown && (
                                                        <div className="dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                                                            {properties.filter(p => `${p.street} ${p.number}`.toLowerCase().includes(propSearch.toLowerCase())).map(p => (
                                                                <div
                                                                    key={p.id}
                                                                    className="dropdown-item"
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, property_id: p.id });
                                                                        setPropSearch(`${p.street} ${p.number} (${p.type})`);
                                                                        setShowPropDropdown(false);
                                                                    }}
                                                                    style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                                                >
                                                                    {p.street} {p.number} - {p.type}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {!formData.property_id && (
                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        ¿No existe? Se creará <strong>{extractedData.property.street} {extractedData.property.number}</strong> automáticamente.
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Seleccionar Inquilino</span>
                                                    {!formData.tenant_id ? (
                                                        <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(22, 163, 74, 0.1)', color: '#166534', border: 'none' }}>Automático (Extraído)</span>
                                                    ) : (
                                                        <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: 'none' }}>Vinculado</span>
                                                    )}
                                                </div>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar inquilino..."
                                                        value={tenantSearch}
                                                        disabled={!!extractedData}
                                                        onChange={e => {
                                                            setTenantSearch(e.target.value);
                                                            setShowTenantDropdown(true);
                                                        }}
                                                        style={{ marginBottom: 0, background: extractedData ? '#f8fafc' : 'white' }}
                                                    />
                                                    {showTenantDropdown && (
                                                        <div className="dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                                                            {tenants.filter(t => `${t.first_name} ${t.last_name}`.toLowerCase().includes(tenantSearch.toLowerCase())).map(t => (
                                                                <div
                                                                    key={t.id}
                                                                    className="dropdown-item"
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, tenant_id: t.id });
                                                                        setTenantSearch(`${t.first_name} ${t.last_name}`);
                                                                        setShowTenantDropdown(false);
                                                                    }}
                                                                    style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                                                >
                                                                    {t.first_name} {t.last_name} (DNI: {t.dni})
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {!formData.tenant_id && (
                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        ¿No existe? Se creará <strong>{extractedData.tenant.first_name} {extractedData.tenant.last_name}</strong> automáticamente.
                                                    </div>
                                                )}
                                            </div>

                                            {/* Optional Owner Selection for NEW properties */}
                                            {!formData.property_id && (
                                                <div style={{ position: 'relative' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Vincular Propietario (Opcional)</span>
                                                        {!extractedData.property.owner_id ? (
                                                            <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(22, 163, 74, 0.1)', color: '#166534', border: 'none' }}>Automático (Extraído)</span>
                                                        ) : (
                                                            <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: 'none' }}>Vinculado</span>
                                                        )}
                                                    </div>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Buscar propietario..."
                                                            value={ownerSearch}
                                                            disabled={!!extractedData}
                                                            onChange={e => {
                                                                setOwnerSearch(e.target.value);
                                                                setShowOwnerDropdown(true);
                                                            }}
                                                            style={{ marginBottom: 0, background: extractedData ? '#f8fafc' : 'white' }}
                                                        />
                                                        {showOwnerDropdown && (
                                                            <div className="dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                                                                {owners.filter(o => `${o.first_name} ${o.last_name}`.toLowerCase().includes(ownerSearch.toLowerCase())).map(o => (
                                                                    <div
                                                                        key={o.id}
                                                                        className="dropdown-item"
                                                                        onClick={() => {
                                                                            setExtractedData({
                                                                                ...extractedData,
                                                                                property: { ...extractedData.property, owner_id: o.id }
                                                                            });
                                                                            setOwnerSearch(`${o.first_name} ${o.last_name}`);
                                                                            setShowOwnerDropdown(false);
                                                                        }}
                                                                        style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                                                    >
                                                                        {o.first_name} {o.last_name} (DNI: {o.dni})
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!extractedData.property.owner_id && (
                                                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            ¿No existe? Se creará <strong>{extractedData.owner.first_name} {extractedData.owner.last_name}</strong> automáticamente para este inmueble.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="card" style={{ background: '#f8fafc', padding: '1.5rem', marginBottom: '2rem' }}>
                                    <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Detalles del Contrato</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inicio</span>
                                            <input
                                                type="date"
                                                value={extractedData.contract.start_date || ''}
                                                onChange={e => setExtractedData({
                                                    ...extractedData,
                                                    contract: { ...extractedData.contract, start_date: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fin</span>
                                            <input
                                                type="date"
                                                value={extractedData.contract.end_date || ''}
                                                onChange={e => setExtractedData({
                                                    ...extractedData,
                                                    contract: { ...extractedData.contract, end_date: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monto Alquiler</span>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700' }}>$</span>
                                                <input
                                                    type="text"
                                                    value={extractedData.contract.rent_amount || ''}
                                                    onChange={e => setExtractedData({
                                                        ...extractedData,
                                                        contract: { ...extractedData.contract, rent_amount: e.target.value }
                                                    })}
                                                    style={{ paddingLeft: '25px', marginBottom: 0 }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incremento (meses)</span>
                                            <input
                                                type="number"
                                                value={extractedData.contract.increase_frequency_months || 6}
                                                onChange={e => setExtractedData({
                                                    ...extractedData,
                                                    contract: { ...extractedData.contract, increase_frequency_months: e.target.value }
                                                })}
                                                style={{ marginBottom: 0 }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={() => { setExtractedData(null); setPropSearch(''); setTenantSearch(''); }} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Descartar y Reintentar</button>
                                    <button
                                        onClick={handleConfirmExtracted}
                                        className="btn btn-primary"
                                        style={{ flex: 2 }}
                                    >
                                        Finalizar Registro y Guardar Contrato
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label>Inmueble</label>
                                        <input type="text" placeholder="Buscar inmueble..." value={propSearch} onChange={e => setPropSearch(e.target.value)} />
                                    </div>
                                    <div>
                                        <label>Inquilino</label>
                                        <input type="text" placeholder="Buscar inquilino..." value={tenantSearch} onChange={e => setTenantSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label>Fecha Inicio</label>
                                        <input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label>Fecha Fin</label>
                                        <input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} required />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label>Monto Alquiler ($)</label>
                                        <input type="number" value={formData.rent_amount} onChange={e => setFormData({ ...formData, rent_amount: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label>Frecuencia de Aumento</label>
                                        <input type="number" value={formData.increase_frequency_months} onChange={e => setFormData({ ...formData, increase_frequency_months: e.target.value })} required />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn">Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Generar Contrato</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default Contracts;
