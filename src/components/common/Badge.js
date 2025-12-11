import React from 'react';

const Badge = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  dot = false,
  className = '' 
}) => {
  const baseClass = 'badge';
  const variantClass = `badge-${variant}`;
  
  return (
    <span className={`${baseClass} ${variantClass} ${className}`}>
      {dot && <span style={{ 
        width: '6px', 
        height: '6px', 
        borderRadius: '50%', 
        backgroundColor: 'currentColor' 
      }} />}
      {children}
    </span>
  );
};

export default Badge;
