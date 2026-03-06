import React from 'react';
import '../../index.css';

/**
 * Custom Modal Dialog Component
 * Replaces standard browser alerts and Material UI dialogs
 */
const CustomDialog = ({ isOpen, open, onClose, title, children, actions, severity = 'info' }) => {
    const isDialogOpen = isOpen !== undefined ? isOpen : open;
    if (!isDialogOpen) return null;

    // Header Color based on severity
    const getHeaderColor = () => {
        switch (severity) {
            case 'error': return 'var(--error)';
            case 'warning': return 'var(--warning)';
            case 'success': return 'var(--success)';
            default: return 'var(--primary-600)';
        }
    };

    const getIcon = () => {
        switch (severity) {
            case 'error': return '⚠️';
            case 'warning': return '⚠️';
            case 'success': return '✅';
            default: return 'ℹ️';
        }
    };

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{getIcon()}</span>
                    <h3 style={{ margin: 0, color: getHeaderColor(), fontSize: '1.25rem' }}>{title}</h3>
                </div>

                <div style={{ color: 'var(--slate-600)', lineHeight: '1.6' }}>
                    {children}
                </div>

                <div className="dialog-actions">
                    {actions || (
                        <button className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomDialog;
