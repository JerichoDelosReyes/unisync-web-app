import React from 'react';

const Loader = ({ size = 'md', className = '' }) => {
  const sizeClass = size !== 'md' ? `loader-${size}` : '';
  
  return (
    <div className={`loader ${sizeClass} ${className}`} />
  );
};

export const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  }}>
    <Loader size="lg" />
  </div>
);

export default Loader;
