export default function PasswordInput({ id = 'password', label = 'Password', placeholder = '••••••••', hint }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1.5">
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            {label}
          </span>
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          name={id}
          type="password"
          placeholder={placeholder}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm pr-10"
        />
        <button 
          type="button" 
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          disabled
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
