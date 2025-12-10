import React from 'react';

const Input = ({
  label,
  error,
  hint,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-group ${className}`}>
      {label && <label className="form-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'var(--gray-400)'
            }} 
          />
        )}
        <input 
          className={`form-input ${error ? 'error' : ''}`}
          style={Icon ? { paddingLeft: '40px' } : {}}
          {...props} 
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
};

export default Input;
