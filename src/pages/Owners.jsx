import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X, Search, User, Phone, Mail, MapPin, DollarSign, FileText, Printer } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const Owners = () => {
    const { success, error } = useToast();
    const { confirm } = useConfirm();
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/owners');
            setOwners(res.data);
        } catch (err) {
            error('Error al cargar propietarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredOwners = owners.filter(o => {
        const search = searchTerm.toLowerCase();
        return (
            o.first_name?.toLowerCase().includes(search) ||
            o.last_name?.toLowerCase().includes(search) ||
            o.dni?.toLowerCase().includes(search) ||
            o.email?.toLowerCase().includes(search) ||
            o.whatsapp?.toLowerCase().includes(search) ||
            o.address?.toLowerCase().includes(search)
        );
    });

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

    const totalPercibido = Number(liqData.alquiler) + Number(liqData.tasaMunicipal);
    const totalDescuentos = Number(liqData.pagoTasaMunicipal) + Number(liqData.recargo) + Number(liqData.pagoFacLuz) + Number(liqData.descuentoAdmin);
    const totalAPagar = totalPercibido - totalDescuentos;
    const selectedContract = ownerContracts.find(c => c.id == liqData.contract_id);

    const getMonthName = (m) => {
        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return months[Number(m) - 1];
    };

    return (
        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-section, .print-section * {
                        visibility: visible;
                    }
                    .print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                .liq-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    font-family: Arial, sans-serif;
                }
                .liq-table th, .liq-table td {
                    border: 1px solid #777;
                    padding: 8px;
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
                            ) : filteredOwners.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron propietarios.</td></tr>
                            ) : filteredOwners.map(o => (
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
                <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: printingLiq ? '800px' : '600px', position: 'relative', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button onClick={() => setShowLiqModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ marginBottom: '0.25rem' }}>Confeccionar Liquidación</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Genera la liquidación para {liquidatingOwner?.first_name} {liquidatingOwner?.last_name}.</p>
                        </div>

                        {!printingLiq ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label>Inmueble / Contrato</label>
                                    <select value={liqData.contract_id} onChange={handleLiqContractChange} required>
                                        <option value="">Seleccione contrato activo...</option>
                                        {ownerContracts.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.property.street} {c.property.number} - Inq: {c.tenant.first_name} {c.tenant.last_name}
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
                                    <button onClick={() => setPrintingLiq(true)} disabled={!liqData.contract_id} className="btn btn-primary" style={{ flex: 2 }}>
                                        <FileText size={18} /> Previsualizar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="print-section" style={{ background: 'white', padding: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                        <img src="/client_logo.png" alt="SC Inmobiliaria" style={{ maxHeight: '80px', objectFit: 'contain' }} />
                                    </div>
                                    <table className="liq-table">
                                        <thead>
                                            <tr>
                                                <th style={{ fontSize: '1.1rem' }}>Sr: {liquidatingOwner?.first_name.toUpperCase()} {liquidatingOwner?.last_name.toUpperCase()}</th>
                                                <th style={{ fontSize: '1.1rem', textAlign: 'right' }}>San Cristobal {getMonthName(liqData.month)} {liqData.year}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colSpan="2" style={{ fontStyle: 'italic', textAlign: 'center', background: '#f8fafc', padding: '12px' }}>
                                                    Pago correspondiente {getMonthName(liqData.month)} del {liqData.year}. Vivienda de calle {selectedContract?.property?.street} Nº {selectedContract?.property?.number} - {selectedContract?.tenant?.last_name}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Monto Alquiler <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount">{Number(liqData.alquiler).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td>Tasa Municipal <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount">{Number(liqData.tasaMunicipal).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 'bold' }}>Total Percibido <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount" style={{ fontWeight: 'bold' }}>{totalPercibido.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan="2" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'underline', padding: '15px' }}>
                                                    DESCUENTOS
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>pago tasa municipal <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount">{Number(liqData.pagoTasaMunicipal).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td>recargo <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount">{Number(liqData.recargo).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td>pago fac. luz <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount">{Number(liqData.pagoFacLuz).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td>descuento por administracion <span style={{ float: 'right' }}>............................................................................. $</span></td>
                                                <td className="amount">{Number(liqData.descuentoAdmin).toLocaleString('es-AR')}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Total a pagar</td>
                                                <td className="amount" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{totalAPagar.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="no-print" style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={() => setPrintingLiq(false)} className="btn" style={{ flex: 1, background: '#f1f5f9' }}>Atrás</button>
                                    <button onClick={printLiquidation} className="btn btn-primary" style={{ flex: 2 }}>
                                        <Printer size={18} /> Imprimir Documento
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Owners;
