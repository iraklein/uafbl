interface ErrorAlertProps {
  error: string | null
  className?: string
  variant?: 'error' | 'warning' | 'info'
  onClose?: () => void
}

export default function ErrorAlert({ 
  error, 
  className = "mb-6",
  variant = 'error',
  onClose
}: ErrorAlertProps) {
  if (!error) return null

  const variantClasses = {
    error: 'bg-red-100 border-red-400 text-red-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700'
  }

  return (
    <div className={`${variantClasses[variant]} border px-4 py-3 rounded ${className}`}>
      <div className="flex justify-between items-start">
        <span>{error}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-current opacity-70 hover:opacity-100 focus:opacity-100"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}