import { forwardRef, InputHTMLAttributes } from 'react'

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'outlined'
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerClassName?: string
  labelClassName?: string
  inputClassName?: string
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  error,
  helperText,
  size = 'md',
  variant = 'default',
  fullWidth = true,
  leftIcon,
  rightIcon,
  className = '',
  containerClassName = '',
  labelClassName = '',
  inputClassName = '',
  disabled,
  required,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-base'
  }

  const variantClasses = {
    default: 'border border-gray-300 bg-white',
    filled: 'border border-gray-300 bg-gray-50',
    outlined: 'border-2 border-gray-300 bg-white'
  }

  const baseInputClasses = `
    block rounded-md shadow-sm text-gray-900
    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
    ${fullWidth ? 'w-full' : ''}
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
    ${inputClassName}
  `.trim().replace(/\s+/g, ' ')

  return (
    <div className={`${containerClassName}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          className={`${baseInputClasses} ${className}`}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="text-gray-400">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      
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

FormInput.displayName = 'FormInput'

export default FormInput