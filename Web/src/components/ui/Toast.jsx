export default function Toast({ kind = 'info', message = '' }) {
  const styles = {
    info: 'bg-primary/10 text-primary',
    warning: 'bg-brand/10 text-brand',
    success: 'bg-accent/10 text-primary',
  }
  if (!message) return null
  return (
    <div role="status" aria-live="polite" className={`${styles[kind]} rounded-md px-3 py-2 text-sm`}>
      {message}
    </div>
  )
}
