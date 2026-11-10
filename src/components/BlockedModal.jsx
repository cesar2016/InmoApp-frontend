import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BlockedModal = () => {
    const { blocked, blockedMessage } = useAuth();

    if (!blocked) return null;

    return (
        <div
            className="confirm-overlay"
            style={{ zIndex: 99999 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="blocked-modal-title"
        >
            <div className="confirm-modal">
                <div className="confirm-header">
                    <div className="confirm-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
                        <AlertTriangle size={24} />
                    </div>
                    <h3 id="blocked-modal-title">Acceso restringido</h3>
                </div>
                <div className="confirm-body">
                    <p>{blockedMessage}</p>
                </div>
                <div className="confirm-footer">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => window.location.reload()}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlockedModal;
