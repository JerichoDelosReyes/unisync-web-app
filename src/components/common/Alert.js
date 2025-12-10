import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const Alert = ({ 
  children, 
  variant = 'info', 
  title,
  dismissible = false,
  onDismiss,
  className = '' 
}) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = icons[variant] || Info;

  return (
    <div className={`alert alert-${variant} ${className}`}>
      <Icon className="alert-icon" size={20} />
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: '4px' }}>{title}</div>}
        <div>{children}</div>
      </div>
      {dismissible && (
        <button 
          onClick={onDismiss}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            padding: '4px',
            opacity: 0.7
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
