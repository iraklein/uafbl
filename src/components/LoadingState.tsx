interface LoadingStateProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingState({ 
  message = "Loading...", 
  className = "text-center py-8",
  size = 'md'
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  }

  return (
    <div className={className}>
      <div className={`${sizeClasses[size]} text-gray-600`}>
        {message}
      </div>
    </div>
  )
}