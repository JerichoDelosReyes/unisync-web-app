import clsx from 'clsx'

export default function Button({ children, variant = 'primary', disabled = false, className = '', type = 'button', onClick }) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold focus-ring transition-colors select-none'
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
    ghost: 'bg-white text-primary ring-1 ring-primary/20 hover:bg-primary/10 active:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed',
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={clsx(base, variants[variant], className)}>
      {children}
    </button>
  )
}
