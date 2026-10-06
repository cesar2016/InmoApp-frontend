import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X, Search, User, Phone, Mail, MapPin, DollarSign, FileText, Printer, History, Send, MessageCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const Owners = () => {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0
    });
    const [showModal, setShowModal] = useState(false);
    const [editingOwner, setEditingOwner] = useState(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dni: '',
        address: '',
        whatsapp: '',
        email: ''
    });

    // Liquidation state
    const [showLiqModal, setShowLiqModal] = useState(false);
    const [liquidatingOwner, setLiquidatingOwner] = useState(null);
    const [ownerContracts, setOwnerContracts] = useState([]);
    const [printingLiq, setPrintingLiq] = useState(false);
    const [liqData, setLiqData] = useState({
        contract_id: '',
        month: String(new Date().getMonth() + 1).padStart(2, '0'),
        year: new Date().getFullYear(),
        alquiler: 0,
        tasaMunicipal: 0,
        pagoTasaMunicipal: 0,
        recargo: 0,
        pagoFacLuz: 0,
        descuentoAdmin: 0,
    });

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedOwnerForHistory, setSelectedOwnerForHistory] = useState(null);
    const [ownerLiquidations, setOwnerLiquidations] = useState([]);
    const [savingLiq, setSavingLiq] = useState(false);

    const fetchData = async (page = 1, search = searchTerm) => {
        setLoading(true);
        try {
            const res = await api.get(`/owners?page=${page}&search=${search}`);
            setOwners(res.data.data);
            setPagination({
                current_page: res.data.current_page,
                last_page: res.data.last_page,
                total: res.data.total
            });
        } catch (err) {
            error('Error al cargar propietarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetchData(1, searchTerm);
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingOwner) {
                await api.put(`/owners/${editingOwner.id}`, formData);
                success('Propietario actualizado');
            } else {
                await api.post('/owners', formData);
                success('Propietario registrado');
            }
            setShowModal(false);
            setEditingOwner(null);
            setFormData({ first_name: '', last_name: '', dni: '', address: '', whatsapp: '', email: '' });
            fetchData();
        } catch (err) {
            error('Error al guardar: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleEdit = (o) => {
        setEditingOwner(o);
        setFormData({
            first_name: o.first_name,
            last_name: o.last_name,
            dni: o.dni,
            address: o.address,
            whatsapp: o.whatsapp,
            email: o.email
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm('¿Eliminar Propietario?', '¿Estás seguro de que deseas eliminar este propietario? Esta acción no se puede deshacer.');
        if (isConfirmed) {
            try {
                await api.delete(`/owners/${id}`);
                success('Propietario eliminado');
                fetchData();
            } catch (err) {
                error('No se pudo eliminar el propietario');
            }
        }
    };

    const handleOpenLiquidation = async (owner) => {
        setLiquidatingOwner(owner);
        try {
            const res = await api.get('/contracts');
            const activeOwnerContracts = res.data.filter(c => c.is_active && c.property?.owner?.id === owner.id);
            setOwnerContracts(activeOwnerContracts);
            setLiqData({
                contract_id: '',
                month: String(new Date().getMonth() + 1).padStart(2, '0'),
                year: new Date().getFullYear(),
                alquiler: 0,
                tasaMunicipal: 0,
                pagoTasaMunicipal: 0,
                recargo: 0,
                pagoFacLuz: 0,
                descuentoAdmin: 0,
            });
            setShowLiqModal(true);
            setPrintingLiq(false);
        } catch (err) {
            error('Error al cargar contratos del propietario');
        }
    };

    const handleLiqContractChange = (e) => {
        const cid = e.target.value;
        const contract = ownerContracts.find(c => c.id == cid);
        setLiqData({
            ...liqData,
            contract_id: cid,
            alquiler: contract ? contract.rent_amount : 0
        });
    };

    const printLiquidation = () => {
        window.print();
    };

    const handleSaveLiquidation = async () => {
        setSavingLiq(true);
        try {
            await api.post('/liquidations', {
                owner_id: liquidatingOwner.id,
                contract_id: liqData.contract_id,
                month: liqData.month,
                year: liqData.year,
                alquiler: liqData.alquiler,
                tasa_municipal: liqData.tasaMunicipal,
                pago_tasa_municipal: liqData.pagoTasaMunicipal,
                recargo: liqData.recargo,
                pago_luz: liqData.pagoFacLuz,
                descuento_admin: liqData.descuentoAdmin,
                total_percibido: totalPercibido,
                total_liquidado: totalAPagar
            });
            success('Liquidación guardada correctamente');
            setShowLiqModal(false);
        } catch (err) {
            error('Error al guardar liquidación: ' + (err.response?.data?.message || err.message));
        } finally {
            setSavingLiq(false);
        }
    };

    const handleOpenHistory = async (owner) => {
        setSelectedOwnerForHistory(owner);
        setShowHistoryModal(true);
        try {
            const res = await api.get(`/liquidations?owner_id=${owner.id}`);
            setOwnerLiquidations(res.data);
        } catch (err) {
            error('Error al cargar historial de liquidaciones');
        }
    };

    const handleShareLiquidation = async (method) => {
        const input = document.getElementById('printable-receipt');
        if (!input) return;

        setSavingLiq(true); // Reusing state for loading
        try {
            const canvas = await html2canvas(input, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const pdfBlob = pdf.output('blob');
            const filename = `Liquidacion_${liquidatingOwner.last_name}_${getMonthName(liqData.month)}_${liqData.year}.pdf`;

            if (method === 'whatsapp') {
                const file = new File([pdfBlob], filename, { type: 'application/pdf' });
                const text = `Hola ${liquidatingOwner.first_name}, te adjunto la liquidación de ${getMonthName(liqData.month)} ${liqData.year}.`;

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Liquidación de Alquiler',
                        text: text
                    });
                    success('Compartido correctamente');
                } else {
                    // Fallback for browsers that don't support file sharing
                    const url = URL.createObjectURL(pdfBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    link.click();
                    
                    window.open(`https://wa.me/${liquidatingOwner.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                    success('PDF generado. Por favor adjúntalo en el chat de WhatsApp que se abrió.');
                }
            } else if (method === 'email') {
                // For Email, we need to send it to the backend
                const formData = new FormData();
                formData.append('file', pdfBlob, filename);
                formData.append('owner_id', liquidatingOwner.id);
                formData.append('email', liquidatingOwner.email);
                formData.append('subject', `Liquidación Alquiler - ${getMonthName(liqData.month)} ${liqData.year}`);
                
                await api.post('/liquidations/send-email', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                success('Email enviado correctamente');
            }
        } catch (err) {
            error('Error al procesar el PDF: ' + err.message);
        } finally {
            setSavingLiq(false);
        }
    };

    const totalPercibido = Number(liqData.alquiler) + Number(liqData.tasaMunicipal);
    const totalDescuentos = Number(liqData.pagoTasaMunicipal) + Number(liqData.recargo) + Number(liqData.pagoFacLuz) + Number(liqData.descuentoAdmin);
    const totalAPagar = totalPercibido - totalDescuentos;
    const selectedContract = ownerContracts.find(c => c.id == liqData.contract_id);

    const getMonthName = (m) => {
        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const idx = Number(m) - 1;
        return months[idx] || '';
    };

    return (
        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
            <style>
                {`
                @media print {
                    @page { margin: 1cm; }
                    body { background: white !important; }
                    body * { visibility: hidden !important; }
                    #printable-receipt, #printable-receipt * { 
                        visibility: visible !important; 
                        color: black !important;
                    }
                    #printable-receipt {
                        position: static !important;
                        display: block !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print { display: none !important; }
                    table { display: table !important; width: 100% !important; border-collapse: collapse !important; }
                    tr { display: table-row !important; }
                    th, td { display: table-cell !important; border: 1px solid black !important; padding: 8px !important; }
                }
                .liq-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                .liq-table th, .liq-table td {
                    border: 1px solid #777;
                    padding: 10px;
                    text-align: left;
                }
                .liq-table .amount {
                    text-align: right;
                }
                `}
            </style>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Propietarios</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Administra los dueños de los inmuebles en cartera.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="search-wrapper">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar propietario..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-orange" onClick={() => { setEditingOwner(null); setFormData({ first_name: '', last_name: '', dni: '', address: '', whatsapp: '', email: '' }); setShowModal(true); }}>
                        <Plus size={18} /> Nuevo Propietario
                    </button>
                </div>
            </div>

            <div className="card no-print" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Propietario</th>
                                <th>DNI / CUIT</th>
                                <th>Contacto</th>
                                <th>Dirección</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando datos...</td></tr>
                                ) : owners.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron propietarios.</td></tr>
                                ) : owners.map(o => (
                                <tr key={o.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                {o.first_name[0]}{o.last_name[0]}
                                            </div>
                                            <div style={{ fontWeight: '600' }}>{o.first_name} {o.last_name}</div>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.9rem' }}>{o.dni}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Phone size={12} color="var(--text-muted)" /> {o.whatsapp}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Mail size={12} /> {o.email}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MapPin size={14} color="var(--secondary)" />
                                            <span style={{ fontSize: '0.9rem' }}>{o.address}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleOpenLiquidation(o)} className="btn" style={{ padding: '0.5rem', background: '#ecfdf5', color: '#059669' }} title="Generar Liquidación">
                                                <DollarSign size={16} />
                                            </button>
                                            <button onClick={() => handleOpenHistory(o)} className="btn" style={{ padding: '0.5rem', background: '#e0f2fe', color: '#0284c7' }} title="Ver Historial">
                                                <History size={16} />
                                            </button>
                                            <button onClick={() => handleEdit(o)} className="btn" style={{ padding: '0.5rem', background: '#f1f5f9', color: 'var(--secondary)' }} title="Editar">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(o.id)} className="btn" style={{ padding: '0.5rem', background: '#fef2f2', color: '#ef4444' }} title="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {pagination.last_page > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem', borderTop: '1px solid var(--border)', background: 'white' }}>
                        <button 
                            className="btn" 
                            disabled={pagination.current_page === 1} 
                            onClick={() => fetchData(pagination.current_page - 1)}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            Anterior
                        </button>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Página <strong>{pagination.current_page}</strong> de {pagination.last_page}
                        </span>
                        <button 
                            className="btn" 
                            disabled={pagination.current_page === pagination.last_page} 
                            onClick={() => fetchData(pagination.current_page + 1)}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', position: 'relative', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ marginBottom: '0.25rem' }}>{editingOwner ? 'Editar' : 'Nuevo'} Propietario</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ingresa los datos personales y de contacto del dueño.</p>
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
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="propietario@mail.com" />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                                    {editingOwner ? 'Guardar Cambios' : 'Registrar Propietario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showLiqModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: printingLiq ? '800px' : '600px', position: 'relative', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button className="no-print" onClick={() => setShowLiqModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div className="no-print" style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ marginBottom: '0.25rem' }}>Confeccionar Liquidación</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Genera la liquidación para {liquidatingOwner?.first_name} {liquidatingOwner?.last_name}.</p>
                        </div>

                        {!printingLiq ? (
                            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label>Inmueble / Contrato</label>
                                    <select value={liqData.contract_id} onChange={handleLiqContractChange} required>
                                        <option value="">Seleccione contrato activo...</option>
                                        {ownerContracts.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.property?.street || 'Sin calle'} {c.property?.number || ''} - Inq: {c.tenant?.first_name || 'N/A'} {c.tenant?.last_name || ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label>Mes</label>
                                        <select value={liqData.month} onChange={e => setLiqData({ ...liqData, month: e.target.value })}>
                                            {[...Array(12).keys()].map(i => (
                                                <option key={i+1} value={String(i+1).padStart(2, '0')}>{getMonthName(i+1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label>Año</label>
                                        <input type="number" value={liqData.year} onChange={e => setLiqData({ ...liqData, year: e.target.value })} />
                                    </div>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                    <div>
                                        <label>Monto Alquiler ($)</label>
                                        <input type="number" value={liqData.alquiler} onChange={e => setLiqData({ ...liqData, alquiler: e.target.value })} />
                                    </div>
                                    <div>
                                        <label>Tasa Municipal Cobrada ($)</label>
                                        <input type="number" value={liqData.tasaMunicipal} onChange={e => setLiqData({ ...liqData, tasaMunicipal: e.target.value })} />
                                    </div>
                                    <div style={{ gridColumn: 'span 2', fontWeight: 600, color: 'var(--primary)' }}>
                                        Total Percibido: ${Number(liqData.alquiler) + Number(liqData.tasaMunicipal)}
                                    </div>
                                </div>

                                <div><h4 style={{ margin: '0.5rem 0' }}>Descuentos</h4></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label>Pago Tasa Municipal ($)</label>
                                        <input type="number" value={liqData.pagoTasaMunicipal} onChange={e => setLiqData({ ...liqData, pagoTasaMunicipal: e.target.value })} />
                                    </div>
                                    <div>
                                        <label>Recargo ($)</label>
                                        <input type="number" value={liqData.recargo} onChange={e => setLiqData({ ...liqData, recargo: e.target.value })} />
                                    </div>
                                    <div>
                                        <label>Pago Fac. Luz ($)</label>
                                        <input type="number" value={liqData.pagoFacLuz} onChange={e => setLiqData({ ...liqData, pagoFacLuz: e.target.value })} />
                                    </div>
                                    <div>
                                        <label>Desc. por Administración ($)</label>
                                        <input type="number" value={liqData.descuentoAdmin} onChange={e => setLiqData({ ...liqData, descuentoAdmin: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowLiqModal(false)} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Cancelar</button>
                                    <button onClick={() => { console.log("PrintingLiq set to true"); setPrintingLiq(true); }} disabled={!liqData.contract_id} className="btn btn-primary" style={{ flex: 2 }}>
                                        <FileText size={18} /> Previsualizar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                    <button onClick={() => setPrintingLiq(false)} className="btn" style={{ flex: '1 1 100px', background: '#f1f5f9' }}>Atrás</button>
                                    <button onClick={handleSaveLiquidation} disabled={savingLiq} className="btn" style={{ flex: '1 1 150px', background: '#22c55e', color: 'white' }}>
                                        {savingLiq ? 'Guardando...' : 'Guardar en Historial'}
                                    </button>
                                    <button onClick={() => handleShareLiquidation('whatsapp')} disabled={savingLiq} className="btn" style={{ flex: '1 1 150px', background: '#25D366', color: 'white' }}>
                                        <MessageCircle size={18} /> WhatsApp
                                    </button>
                                    <button onClick={() => handleShareLiquidation('email')} disabled={savingLiq} className="btn" style={{ flex: '1 1 150px', background: '#3b82f6', color: 'white' }}>
                                        <Send size={18} /> Email
                                    </button>
                                    <button onClick={printLiquidation} className="btn btn-primary" style={{ flex: '2 1 200px' }}>
                                        <Printer size={18} /> Imprimir
                                    </button>
                                </div>

                                <div className="print-section" id="printable-receipt" style={{ background: 'white', padding: '2rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                        <img src="/client_logo.png" alt="SC Inmobiliaria" style={{ maxHeight: '80px', objectFit: 'contain' }} />
                                    </div>
                                    <table className="liq-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ fontSize: '1.1rem', textAlign: 'left', padding: '10px' }}>Sr: {(liquidatingOwner?.first_name || 'Propietario').toUpperCase()} {(liquidatingOwner?.last_name || '').toUpperCase()}</th>
                                                <th style={{ fontSize: '1.1rem', textAlign: 'right', padding: '10px' }}>San Cristobal {getMonthName(liqData.month)} {liqData.year}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colSpan="2" style={{ fontStyle: 'italic', textAlign: 'center', background: '#f8fafc', padding: '15px', border: '1px solid #e2e8f0' }}>
                                                    Pago correspondiente {getMonthName(liqData.month)} del {liqData.year}. Vivienda de calle {selectedContract?.property?.street} Nº {selectedContract?.property?.number} - {selectedContract?.tenant?.last_name}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Monto Alquiler <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount" style={{ textAlign: 'right', padding: '10px', border: '1px solid #e2e8f0' }}>{Number(liqData.alquiler).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Tasa Municipal <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount" style={{ textAlign: 'right', padding: '10px', border: '1px solid #e2e8f0' }}>{Number(liqData.tasaMunicipal).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 'bold', padding: '10px', border: '1px solid #e2e8f0' }}>Total Percibido <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount" style={{ fontWeight: 'bold', textAlign: 'right', padding: '10px', border: '1px solid #e2e8f0' }}>{totalPercibido.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan="2" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'underline', padding: '15px', border: '1px solid #e2e8f0' }}>
                                                    DESCUENTOS
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textTransform: 'lowercase' }}>pago tasa municipal <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount" style={{ textAlign: 'right', padding: '10px', border: '1px solid #e2e8f0' }}>{Number(liqData.pagoTasaMunicipal).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textTransform: 'lowercase' }}>recargo <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount" style={{ textAlign: 'right', padding: '10px', border: '1px solid #e2e8f0' }}>{Number(liqData.recargo).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textTransform: 'lowercase' }}>pago fac. luz <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount" style={{ textAlign: 'right', padding: '10px', border: '1px solid #e2e8f0' }}>{Number(liqData.pagoFacLuz).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textTransform: 'lowercase' }}>descuento por administracion <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount" style={{ textAlign: 'right', padding: '10px', border: '1px solid #e2e8f0' }}>{Number(liqData.descuentoAdmin).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '15px', border: '1px solid #e2e8f0' }}>Total a pagar</td>
                                                <td className="amount" style={{ fontWeight: 'bold', fontSize: '1.25rem', textAlign: 'right', padding: '15px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>{totalAPagar.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showHistoryModal && selectedOwnerForHistory && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '2.5rem' }}>
                        <button onClick={() => setShowHistoryModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <History size={24} color="var(--primary)" /> Historial de Liquidaciones
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Registro de pagos liquidados a {selectedOwnerForHistory.first_name} {selectedOwnerForHistory.last_name}.</p>
                        </div>

                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha Registro</th>
                                        <th>Periodo</th>
                                        <th>Inmueble / Inquilino</th>
                                        <th style={{ textAlign: 'right' }}>Percibido</th>
                                        <th style={{ textAlign: 'right' }}>Liquidado</th>
                                        <th style={{ textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ownerLiquidations.length === 0 ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No hay liquidaciones registradas.</td></tr>
                                    ) : (
                                        ownerLiquidations.map(liq => (
                                            <tr key={liq.id}>
                                                <td>{new Date(liq.created_at).toLocaleDateString()}</td>
                                                <td><strong>{getMonthName(liq.month)} {liq.year}</strong></td>
                                                <td>
                                                    <div style={{ fontSize: '0.9rem' }}>{liq.contract?.property?.street} {liq.contract?.property?.number}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Inq: {liq.contract?.tenant?.last_name}</div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>${Number(liq.total_percibido).toLocaleString('es-AR')}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>${Number(liq.total_liquidado).toLocaleString('es-AR')}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button onClick={async () => {
                                                        const isConfirmed = await confirm('¿Eliminar registro?', 'Esta acción solo borrará el historial, no afectará los pagos reales.');
                                                        if (isConfirmed) {
                                                            try {
                                                                await api.delete(`/liquidations/${liq.id}`);
                                                                setOwnerLiquidations(prev => prev.filter(p => p.id !== liq.id));
                                                                success('Registro eliminado');
                                                            } catch (err) { error('Error al eliminar'); }
                                                        }
                                                    }} className="btn" style={{ padding: '4px', color: '#ef4444' }} title="Borrar historial">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Owners;
