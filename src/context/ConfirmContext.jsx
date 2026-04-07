import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, X, HelpCircle } from 'lucide-react';

const ConfirmContext = createContext();

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
    return context;
};

export const ConfirmProvider = ({ children }) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        resolve: null
    });

    const confirm = useCallback((title, message) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                resolve
            });
        });
    }, []);

    const handleConfirm = () => {
        confirmState.resolve(true);
        setConfirmState({ ...confirmState, isOpen: false, resolve: null });
    };

    const handleCancel = () => {
        confirmState.resolve(false);
        setConfirmState({ ...confirmState, isOpen: false, resolve: null });
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {confirmState.isOpen && (
                <div className="confirm-overlay">
                    <div className="confirm-modal">
                        <div className="confirm-header">
                            <div className="confirm-icon">
                                <HelpCircle size={24} />
                            </div>
                            <h3>{confirmState.title}</h3>
                            <button className="confirm-close" onClick={handleCancel}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="confirm-body">
                            <p>{confirmState.message}</p>
                        </div>
                        <div className="confirm-footer">
                            <button className="btn btn-ghost" onClick={handleCancel}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleConfirm}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};
