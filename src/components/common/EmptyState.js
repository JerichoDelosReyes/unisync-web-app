import React from 'react';
import { FileX } from 'lucide-react';

const EmptyState = ({
  icon: Icon = FileX,
  title = 'No data found',
  description = 'There is nothing to display at the moment.',
  action,
  className = ''
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <Icon className="empty-state-icon" size={64} />
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-text">{description}</p>
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
