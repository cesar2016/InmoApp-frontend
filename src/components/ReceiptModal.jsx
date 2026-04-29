import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Save, FileText, DollarSign, Calendar, Info } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Use the absolute path for the generated logo
const LOGO_URL = "/client_logo.png";

const ReceiptModal = ({ isOpen, onClose, tenant, onSave }) => {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const printRef = useRef();

    const activeContract = tenant?.contracts?.find(c => c.is_active);

    const [formData, setFormData] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
        detail: 'Alquiler Mensual',
        amount: activeContract?.rent_amount || 0,
        subtotal: activeContract?.rent_amount || 0,
        credit_balance: 0,
        debit_balance: 0,
        total: activeContract?.rent_amount || 0,
        note: ''
    });

    const [concepts, setConcepts] = useState([
        { id: 'impuesto', name: 'Impuesto Inmobiliario', active: false, unitPrice: '', subtotal: '' },
        { id: 'tasa', name: 'Tasa Municipal', active: false, unitPrice: '', subtotal: '' },
        { id: 'mantenimiento', name: 'Mantenimientos', active: false, unitPrice: '', subtotal: '' },
        { id: 'intereses', name: 'Intereses por mora', active: false, unitPrice: '', subtotal: '' }
    ]);

    const [receiptNumber, setReceiptNumber] = useState(1);
    const [totalMonths, setTotalMonths] = useState('-');

    const [paymentMethod, setPaymentMethod] = useState('Contado Eft.');
    const [chequeNumber, setChequeNumber] = useState('');

    // Update form when activeContract changes
    useEffect(() => {
        if (activeContract) {
            setFormData(prev => ({
                ...prev,
                amount: activeContract.rent_amount,
                subtotal: activeContract.rent_amount,
                total: activeContract.rent_amount
            }));

            const fetchPaymentsData = async () => {
                try {
                    const res = await api.get('/payments');
                    const contractPayments = res.data.filter(p => p.contract_id === activeContract.id);
                    setReceiptNumber(contractPayments.length + 1);

                    if (contractPayments.length > 0) {
                        // Sort descending by period chronologically
                        contractPayments.sort((a, b) => {
                            const valA = parseInt(a.period_year) * 12 + parseInt(a.period_month);
                            const valB = parseInt(b.period_year) * 12 + parseInt(b.period_month);
                            return valB - valA;
                        });

                        const latest = contractPayments[0];
                        let nextM = parseInt(latest.period_month) + 1;
                        let nextY = parseInt(latest.period_year);
                        if (nextM > 12) {
                            nextM = 1;
                            nextY += 1;
                        }

                        setFormData(prev => ({
                            ...prev,
                            period_month: nextM,
                            period_year: nextY
                        }));
                    }

                    if (activeContract.start_date && activeContract.end_date) {
                        const sDate = new Date(activeContract.start_date);
                        const eDate = new Date(activeContract.end_date);
                        const ms = (eDate.getFullYear() - sDate.getFullYear()) * 12 + (eDate.getMonth() - sDate.getMonth());
                        setTotalMonths(ms > 0 ? ms : '-');
                    }
                } catch (e) {
                    console.error('Error fetching payments:', e);
                }
            };
            fetchPaymentsData();
        }
    }, [activeContract]);

    // Update total whenever subtotal, balances, or active concepts change
    useEffect(() => {
        const sub = parseFloat(formData.subtotal) || 0;
        const extraSum = concepts.filter(c => c.active).reduce((sum, c) => sum + (parseFloat(c.subtotal) || 0), 0);
        const credit = parseFloat(formData.credit_balance) || 0;
        const debit = parseFloat(formData.debit_balance) || 0;
        const total = sub + extraSum + debit - credit;
        setFormData(prev => ({ ...prev, total: total.toFixed(2) }));
    }, [formData.subtotal, formData.credit_balance, formData.debit_balance, concepts]);

    const handleConceptChange = (index, field, value) => {
        setConcepts(prev => {
            const next = [...prev];
            next[index][field] = value;
            return next;
        });
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!activeContract) {
            error('El inquilino no tiene un contrato activo.');
            return;
        }

        setLoading(true);
        try {
            // Include active concepts in the note for record keeping
            const activeConcepts = concepts.filter(c => c.active);
            let finalNote = formData.note;

            let methodText = `Forma de Pago: ${paymentMethod}`;
            if (paymentMethod === 'Cheque') methodText += ` (N°: ${chequeNumber})`;
            finalNote = finalNote ? `${finalNote}\n\n${methodText}` : methodText;

            if (activeConcepts.length > 0) {
                const conceptsText = activeConcepts.map(c => `- ${c.name}: $${c.subtotal}`).join('\n');
                finalNote = `${finalNote}\n\nConceptos Adicionales:\n${conceptsText}`;
            }

            const data = {
                ...formData,
                note: finalNote,
                contract_id: activeContract.id
            };
            await api.post('/payments', data);
            success('Recibo generado y guardado correctamente');
            if (onSave) onSave();
            try {
                // Generar y descargar PDF del recibo (vista de impresión a la derecha)
                await downloadReceiptPdf();
            } catch (pdfErr) {
                console.error('Error al generar PDF del recibo:', pdfErr);
            }
            // We don't close immediately so the user can print
        } catch (err) {
            error('Error al guardar el recibo');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const downloadReceiptPdf = async () => {
        const el = document.getElementById('printable-receipt');
        if (!el) return;

        const canvas = await html2canvas(el, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const renderWidth = imgWidth * ratio;
        const renderHeight = imgHeight * ratio;
        const marginX = (pdfWidth - renderWidth) / 2;

        pdf.addImage(imgData, 'PNG', marginX, 20, renderWidth, renderHeight);
        pdf.save(`recibo_${receiptNumber || '000'}.pdf`);
    };

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
        <div className="receipt-overlay">
            <div className="receipt-modal-container">
                <div className="modal-header no-print">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText className="text-primary" />
                        <h2>Confeccionar Recibo</h2>
                    </div>
                    <button className="close-btn-large" onClick={onClose} title="Cerrar y volver">
                        <X size={24} />
                    </button>
                </div>

                <div className="receipt-modal-body">
                    {/* Input Form */}
                    <form onSubmit={handleSubmit} className="receipt-form no-print">
                        <div className="form-row">
                            <div className="form-group flex-2">
                                <label>Inquilino</label>
                                <input value={`${tenant.first_name} ${tenant.last_name}`} disabled />
                            </div>
                            <div className="form-group flex-1">
                                <label>Fecha de Pago</label>
                                <input
                                    type="date"
                                    value={formData.payment_date}
                                    onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Mes Correspondiente</label>
                                <select
                                    value={formData.period_month}
                                    onChange={e => setFormData({ ...formData, period_month: e.target.value })}
                                >
                                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Año</label>
                                <input
                                    type="number"
                                    value={formData.period_year}
                                    onChange={e => setFormData({ ...formData, period_year: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-row" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                            <div className="form-group flex-1">
                                <label>Forma de Pago</label>
                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                    <option value="Contado Eft.">Contado Eft.</option>
                                    <option value="Pago digital">Pago digital</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>
                            {paymentMethod === 'Cheque' && (
                                <div className="form-group flex-1" style={{ animation: 'slideIn 0.3s ease-out' }}>
                                    <label>N° de Cheque</label>
                                    <input type="text" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} placeholder="00000000" required />
                                </div>
                            )}
                        </div>

                        <div className="receipt-items-editor">
                            <h3>Detalle del Cobro</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ width: '70%', padding: '0.5rem', fontWeight: '500', color: '#64748b' }}>Conceptos 1</th>
                                        <th style={{ width: '25%', padding: '0.5rem', fontWeight: '500', color: '#64748b' }}>Subtotal</th>
                                        <th style={{ width: '5%', textAlign: 'center' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input value={formData.detail} onChange={e => setFormData({ ...formData, detail: e.target.value })} style={{ marginBottom: 0 }} placeholder="Ej: Alquiler Mensual" />
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input type="number" value={formData.subtotal} onChange={e => setFormData({ ...formData, subtotal: e.target.value })} style={{ marginBottom: 0 }} />
                                        </td>
                                        <td></td>
                                    </tr>
                                    {concepts.map((c, i) => (
                                        <React.Fragment key={c.id}>
                                            <tr>
                                                <td colSpan="3" style={{ padding: '0.5rem 0.5rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>Conceptos {i + 2}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', color: '#334155', fontSize: '0.95rem' }}>
                                                        {c.name}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <input type="number" disabled={!c.active} value={c.subtotal} onChange={e => handleConceptChange(i, 'subtotal', e.target.value)} style={{ marginBottom: 0, background: !c.active ? '#f8fafc' : 'white' }} />
                                                </td>
                                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', height: '100%' }}>
                                                        <input type="checkbox" checked={c.active} onChange={e => handleConceptChange(i, 'active', e.target.checked)} style={{ width: '20px', height: '20px', margin: 0, cursor: 'pointer' }} title="Activar/Desactivar concepto" />
                                                    </label>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="balances-section">
                            <div className="form-group">
                                <label>Saldo a Favor ($)</label>
                                <input
                                    type="number"
                                    value={formData.credit_balance}
                                    onChange={e => setFormData({ ...formData, credit_balance: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Saldo Deudor ($)</label>
                                <input
                                    type="number"
                                    value={formData.debit_balance}
                                    onChange={e => setFormData({ ...formData, debit_balance: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="total-display">
                            <span>TOTAL A COBRAR:</span>
                            <span className="total-amount">${formData.total}</span>
                        </div>

                        <div className="form-group">
                            <label>Nota / Observaciones</label>
                            <textarea
                                rows="2"
                                value={formData.note}
                                onChange={e => setFormData({ ...formData, note: e.target.value })}
                                placeholder="Anotaciones adicionales..."
                            ></textarea>
                        </div>

                        <div className="form-actions-grid">
                            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Recibo'}
                            </button>
                            <button type="button" className="btn btn-orange" onClick={handlePrint}>
                                <Printer size={18} /> Imprimir
                            </button>
                        </div>
                    </form>

                    {/* Printable Receipt Preview */}
                    <div className="receipt-print-preview" id="printable-receipt">
                        <div className="receipt-paper">
                            {/* Header */}
                            <div className="receipt-header">
                                <div className="receipt-logo">
                                    <img src={LOGO_URL} alt="Company Logo" />
                                </div>
                                <div className="receipt-company-info">
                                    <h1>InmoApp - Gestión Inmobiliaria</h1>
                                    <p>Propiedades y Administraciones</p>
                                    <p>Tel: +54 9 123 45678 | Email: contacto@inmoapp.com</p>
                                </div>
                                <div className="receipt-type">
                                    <div className="receipt-box">R</div>
                                    <p>DOC. NO VÁLIDO COMO FACTURA</p>
                                </div>
                            </div>

                            <div className="receipt-meta">
                                <div className="meta-left">
                                    <p><strong>Recibo N°:</strong> {receiptNumber} {totalMonths !== '-' ? `de ${totalMonths}` : ''}</p>
                                    <p><strong>Fecha:</strong> {new Date(formData.payment_date).toLocaleDateString()}</p>
                                    <p><strong>Forma de Pago:</strong> {paymentMethod} {paymentMethod === 'Cheque' ? `(N°: ${chequeNumber})` : ''}</p>
                                </div>
                                <div className="meta-right">
                                    <p><strong>Cobro perteneciente al mes de:</strong> {months[formData.period_month - 1]} {formData.period_year}</p>
                                </div>
                            </div>

                            <div className="receipt-client-info">
                                <p><strong>Inquilino:</strong> {tenant.first_name} {tenant.last_name}</p>
                                <p><strong>DNI:</strong> {tenant.dni}</p>
                                <p><strong>Inmueble:</strong> {activeContract?.property?.street} {activeContract?.property?.number}, {activeContract?.property?.location}</p>
                            </div>

                            <table className="receipt-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd', borderRight: '1px solid #ddd' }}>Concepto</th>
                                        <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', borderRight: '1px solid #ddd' }}>{formData.detail}</td>
                                        <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #eee' }}>{formData.subtotal}</td>
                                    </tr>
                                    {concepts.filter(c => c.active).map(c => (
                                        <tr key={c.id}>
                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', borderRight: '1px solid #ddd' }}>{c.name}</td>
                                            <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #eee' }}>{c.subtotal}</td>
                                        </tr>
                                    ))}

                                    <tr>
                                        <td colSpan="2" style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}></td>
                                    </tr>

                                    <tr>
                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', textAlign: 'right' }}>Saldo Favor</td>
                                        <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #eee' }}>{formData.credit_balance}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', textAlign: 'right' }}>saldo deudor</td>
                                        <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #eee' }}>{formData.debit_balance}</td>
                                    </tr>
                                    <tr style={{ background: '#e2e8f0', fontWeight: 'bold' }}>
                                        <td style={{ padding: '0.5rem', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', textAlign: 'right' }}>TOTAL</td>
                                        <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>{formData.total}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {formData.note && (
                                <div className="receipt-note">
                                    <p><strong>Nota:</strong> {formData.note}</p>
                                </div>
                            )}

                            <div className="receipt-signature">
                                <div className="signature-box" style={{ gridColumn: '2 / 3' }}>
                                    <div className="line"></div>
                                    <span>Firma y Sello de la Empresa</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
