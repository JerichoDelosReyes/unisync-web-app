export default function TextInput({ id, label, placeholder = '', type = 'text', hint, value, onChange }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1.5">
          <span className="inline-flex items-center gap-1">
            {type === 'email' && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            )}
            {label}
          </span>
        </label>
      )}
      <input
        id={id}
        name={`user-${id}`}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="off"
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
      />
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
