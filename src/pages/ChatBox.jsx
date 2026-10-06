import React, { useState, useRef, useEffect } from 'react';
import { Send, FileUp, Bot, User, Trash2, Loader2, Sparkles, ExternalLink, Search, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const ChatBox = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { id: 1, role: 'assistant', content: '¡Hola! Soy tu asistente de IA. Puedo ayudarte a analizar contratos, responder dudas sobre la gestión inmobiliaria o procesar documentos. ¿En qué puedo ayudarte hoy?', timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [providers, setProviders] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const { success, error, info } = useToast();
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const res = await api.get('/chat/providers');
                setProviders(res.data);
                if (res.data.length > 0) {
                    setSelectedProvider(res.data[0]);
                }
            } catch (err) {
                console.error('Error fetching providers', err);
            }
        };
        fetchProviders();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            toast.info(`Archivo seleccionado: ${selectedFile.name}`);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() && !file) return;

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: input,
            file: file ? file.name : null,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        const currentFile = file;
        const currentProvider = selectedProvider;
        
        setInput('');
        setFile(null);
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('message', currentInput);
            formData.append('provider', currentProvider);
            if (currentFile) {
                formData.append('file', currentFile);
            }

            const res = await api.post('/chat', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const assistantMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: res.data.response,
                provider: res.data.provider,
                context_length: res.data.context_length,
                fullContext: res.data.fullContext,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al conectar con la IA');
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([{ id: 1, role: 'assistant', content: 'Chat reiniciado. ¿En qué puedo ayudarte?', timestamp: new Date() }]);
        info('Chat reiniciado');
    };

    const handleOpenPreview = async (text, provider) => {
        setLoading(true);
        try {
            const res = await api.post('/chat/parse-text', { text, provider });
            setPreviewData(res.data);
            setShowPreview(true);
        } catch (err) {
            error('Error al estructurar los datos para la previa');
        } finally {
            setLoading(false);
        }
    };

    const handleSmartSave = async () => {
        setIsSaving(true);
        try {
            const res = await api.post('/contracts/smart-save', previewData);
            success(res.data.message);
            setShowPreview(false);
            navigate('/contracts');
        } catch (err) {
            error(err.response?.data?.message || 'Error al guardar el contrato');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 120px)',
            maxWidth: '1000px',
            margin: '0 auto',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            overflow: 'hidden',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 30px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>AI Sandbox</h2>
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Pruebas de LLM y Extracción</span>
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {providers.length > 0 && (
                        <select 
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: 'white',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {providers.map(p => (
                                <option key={p} value={p} style={{ color: '#1e293b' }}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </option>
                            ))}
                        </select>
                    )}
                    <button 
                        onClick={clearChat}
                        className="btn" 
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '10px', padding: '8px' }}
                        title="Limpiar chat"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                padding: '30px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
            }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '6px',
                            fontSize: '0.8rem',
                            color: '#64748b',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                        }}>
                            {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                            <span style={{ fontWeight: '600' }}>{msg.role === 'assistant' ? 'InmoAI' : 'Tú'}</span>
                            <span>•</span>
                            <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.provider && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span className="badge badge-info" style={{ fontSize: '10px', padding: '2px 6px' }}>{msg.provider}</span>
                                    {msg.context_length > 0 && (
                                        <button 
                                            onClick={() => handleOpenPreview(msg.fullContext, msg.provider)}
                                            style={{ 
                                                fontSize: '10px', 
                                                padding: '2px 8px', 
                                                background: '#f59e0b', 
                                                color: 'white', 
                                                border: 'none', 
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontWeight: '600'
                                            }}
                                        >
                                            <Search size={10} /> PREVISUALIZAR ALTA
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <div style={{
                            padding: '16px 20px',
                            borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                            background: msg.role === 'user' ? '#2563eb' : '#f8fafc',
                            color: msg.role === 'user' ? 'white' : '#1e293b',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none'
                        }}>
                            {msg.content}
                            {msg.file && (
                                <div style={{ 
                                    marginTop: '8px', 
                                    padding: '8px 12px', 
                                    background: 'rgba(255,255,255,0.2)', 
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '0.9rem'
                                }}>
                                    <FileUp size={16} />
                                    <span>{msg.file}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="badge badge-info" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Loader2 size={16} className="spinner" />
                            Pensando...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{
                padding: '24px 30px',
                background: 'white',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '12px'
            }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu consulta aquí..."
                        style={{
                            width: '100%',
                            padding: '16px 20px',
                            paddingRight: '100px',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            resize: 'none',
                            height: '60px',
                            fontFamily: 'inherit',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                    />
                    <div style={{ position: 'absolute', right: '10px', bottom: '10px', display: 'flex', gap: '8px' }}>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            style={{ display: 'none' }} 
                            accept=".pdf,.docx,.doc,.odt"
                        />
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="btn"
                            style={{ 
                                background: file ? '#dcfce7' : '#f1f5f9', 
                                color: file ? '#166534' : '#64748b',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px'
                            }}
                        >
                            <FileUp size={20} />
                        </button>
                        <button 
                            type="submit"
                            disabled={loading || (!input.trim() && !file)}
                            className="btn"
                            style={{ 
                                background: '#2563eb', 
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px',
                                opacity: (loading || (!input.trim() && !file)) ? 0.6 : 1
                            }}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </form>
            
            {file && (
                <div style={{ 
                    padding: '8px 30px', 
                    background: '#f8fafc', 
                    fontSize: '0.8rem', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #f1f5f9'
                }}>
                    <span style={{ color: '#475569' }}>Adjunto: <strong>{file.name}</strong></span>
                    <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Quitar</button>
                </div>
            )}

            {/* Smart Preview Modal */}
            {showPreview && previewData && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CheckCircle2 className="text-success" /> Previsualización de Alta Directa
                            </h3>
                            <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Inquilino */}
                            <div className="card" style={{ padding: '15px' }}>
                                <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '10px' }}>Inquilino</h4>
                                <p><strong>Nombre:</strong> {previewData.tenant?.first_name || 'N/A'} {previewData.tenant?.last_name || ''}</p>
                                <p><strong>DNI:</strong> {previewData.tenant?.dni || 'N/A'}</p>
                                <p><strong>Dirección:</strong> {previewData.tenant?.address || 'N/A'}</p>
                            </div>

                            {/* Propietario */}
                            <div className="card" style={{ padding: '15px' }}>
                                <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '10px' }}>Propietario</h4>
                                <p><strong>Nombre:</strong> {previewData.owner?.first_name || 'N/A'} {previewData.owner?.last_name || ''}</p>
                                <p><strong>DNI:</strong> {previewData.owner?.dni || 'N/A'}</p>
                                <p><strong>Dirección:</strong> {previewData.owner?.address || 'N/A'}</p>
                            </div>

                            {/* Propiedad */}
                            <div className="card" style={{ padding: '15px' }}>
                                <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '10px' }}>Propiedad</h4>
                                <p><strong>Calle:</strong> {previewData.property?.street || 'N/A'} {previewData.property?.number || ''}</p>
                                <p><strong>Localidad:</strong> {previewData.property?.location || 'N/A'}</p>
                                <p><strong>Tipo:</strong> {previewData.property?.type || 'N/A'}</p>
                            </div>

                            {/* Contrato */}
                            <div className="card" style={{ padding: '15px' }}>
                                <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '10px' }}>Contrato</h4>
                                <p><strong>Inicio:</strong> {previewData.contract.start_date}</p>
                                <p><strong>Fin:</strong> {previewData.contract.end_date}</p>
                                <p><strong>Monto:</strong> ${previewData.contract.rent_amount?.toLocaleString('es-AR')}</p>
                                <p><strong>Ajuste:</strong> cada {previewData.contract.increase_frequency_months} meses</p>
                            </div>
                        </div>

                        <div style={{ padding: '20px 30px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Cancelar</button>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleSmartSave}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="spinner" /> : 'Confirmar y Dar de Alta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBox;
