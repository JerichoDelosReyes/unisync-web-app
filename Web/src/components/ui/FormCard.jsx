export default function FormCard({ title, description, children, footer }) {
  return (
    <div className="bg-white rounded-card shadow-card ring-1 ring-black/5 p-6">
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>}
          {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  )
}
