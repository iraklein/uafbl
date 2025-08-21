interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  variant?: 'default' | 'blue' | 'green' | 'orange' | 'purple' | 'red'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function StatsCard({
  title,
  value,
  subtitle,
  variant = 'default',
  size = 'md',
  className = ''
}: StatsCardProps) {
  const variantClasses = {
    default: 'bg-white border-gray-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200', 
    purple: 'bg-purple-50 border-purple-200',
    red: 'bg-red-50 border-red-200'
  }

  const valueColorClasses = {
    default: 'text-gray-900',
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    red: 'text-red-600'
  }

  const sizeClasses = {
    sm: {
      container: 'p-3',
      value: 'text-lg',
      title: 'text-xs',
      subtitle: 'text-xs'
    },
    md: {
      container: 'p-4',
      value: 'text-2xl',
      title: 'text-sm',
      subtitle: 'text-sm'
    },
    lg: {
      container: 'p-6',
      value: 'text-3xl',
      title: 'text-base',
      subtitle: 'text-base'
    }
  }

  return (
    <div className={`${variantClasses[variant]} border rounded-lg ${sizeClasses[size].container} ${className}`}>
      <div className={`${sizeClasses[size].value} font-bold ${valueColorClasses[variant]}`}>
        {value}
      </div>
      <div className={`${sizeClasses[size].title} text-gray-600 font-medium`}>
        {title}
      </div>
      {subtitle && (
        <div className={`${sizeClasses[size].subtitle} text-gray-500 mt-1`}>
          {subtitle}
        </div>
      )}
    </div>
  )
}