import { forwardRef, SelectHTMLAttributes } from 'react'

interface Option {
  value: string | number
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'outlined'
  fullWidth?: boolean
  options: Option[]
  placeholder?: string
  containerClassName?: string
  labelClassName?: string
  selectClassName?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  size = 'md',
  variant = 'default',
  fullWidth = true,
  options,
  placeholder,
  className = '',
  containerClassName = '',
  labelClassName = '',
  selectClassName = '',
  disabled,
  required,
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  const variantClasses = {
    default: 'border border-gray-300 bg-white',
    filled: 'border border-gray-300 bg-gray-50',
    outlined: 'border-2 border-gray-300 bg-white'
  }

  const baseSelectClasses = `
    block rounded-md shadow-sm
    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
    ${fullWidth ? 'w-full' : ''}
    ${selectClassName}
  `.trim().replace(/\s+/g, ' ')

  return (
    <div className={`${containerClassName}`}>
      {label && (
        <label 
          htmlFor={selectId}
          className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        required={required}
        className={`${baseSelectClasses} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select