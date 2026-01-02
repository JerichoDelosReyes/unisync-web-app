import { createPortal } from 'react-dom'

/**
 * ModalOverlay Component
 * 
 * A unified modal overlay that properly covers the entire viewport,
 * including safe areas and status bars on mobile devices.
 * Uses React Portal to render at document body level, avoiding
 * stacking context and overflow issues.
 */

export default function ModalOverlay({ 
  children, 
  onClose, 
  className = '',
  blur = true,
  closeOnBackdropClick = true 
}) {
  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget && onClose) {
      onClose()
    }
  }

  const overlay = (
    <div 
      className={`z-[9999] flex items-center justify-center ${blur ? 'backdrop-blur-sm' : ''} bg-black/40 ${className}`}
      style={{
        position: 'fixed',
        top: '-50px',
        left: 0,
        right: 0,
        bottom: '-50px',
        paddingTop: '50px',
        paddingBottom: '50px',
        margin: 0,
      }}
      onClick={handleBackdropClick}
    >
      {children}
    </div>
  )

  // Use portal to render at body level, escaping any overflow:hidden containers
  return createPortal(overlay, document.body)
}
