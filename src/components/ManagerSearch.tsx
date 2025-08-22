import { useManagerSearch } from '../hooks/useManagerSearch'
import { Manager } from '../types'
import ErrorAlert from './ErrorAlert'
import { forwardRef, useRef } from 'react'

interface ManagerSearchProps {
  onManagerSelect?: (manager: Manager) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minQueryLength?: number
  value?: string
  onChange?: (value: string) => void
  managers?: Manager[]
  autoFocus?: boolean
}

const ManagerSearch = forwardRef<HTMLInputElement, ManagerSearchProps>(({
  onManagerSelect,
  placeholder = "Search for manager...",
  className = "",
  disabled = false,
  minQueryLength = 1,
  value,
  onChange,
  managers,
  autoFocus = false
}, ref) => {
  const justSelectedRef = useRef(false)
  
  const {
    query,
    setQuery,
    filteredManagers,
    showSuggestions,
    setShowSuggestions,
    highlightedIndex,
    loading,
    error,
    handleInputChange,
    handleKeyDown,
    handleSuggestionClick,
    handleInputBlur,
    handleInputFocus
  } = useManagerSearch({
    minQueryLength,
    onManagerSelect,
    externalQuery: value,
    preloadedManagers: managers
  })

  // Use controlled value if provided, but ensure autocomplete still works
  const inputValue = value !== undefined ? value : query
  const handleChange = value !== undefined && onChange 
    ? (e: React.ChangeEvent<HTMLInputElement>) => {
        // Don't show suggestions if we just selected a manager
        if (justSelectedRef.current) {
          justSelectedRef.current = false
          onChange(e.target.value)
          setQuery(e.target.value)
          return
        }
        
        // Update external state first
        onChange(e.target.value)
        
        // Then update internal state for autocomplete
        setQuery(e.target.value)
        
        // Trigger search for autocomplete
        const newQuery = e.target.value
        if (newQuery.trim().length >= minQueryLength) {
          handleInputChange(e)
        } else {
          setShowSuggestions(false)
        }
      }
    : handleInputChange

  // Wrap the suggestion click to set our flag
  const wrappedSuggestionClick = (manager: Manager) => {
    justSelectedRef.current = true
    handleSuggestionClick(manager)
  }

  return (
    <div className={`relative ${className}`}>
      <ErrorAlert error={error} className="mb-2" />
      
      <div className="relative">
        <input
          ref={ref}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed text-base"
          autoComplete="off"
        />
        
        {loading && !managers && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        
        {/* Autocomplete Dropdown */}
        {showSuggestions && filteredManagers.length > 0 && !disabled && (
          <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
            {filteredManagers.map((manager, index) => (
              <button
                key={manager.id}
                type="button"
                onClick={() => wrappedSuggestionClick(manager)}
                className={`w-full text-left px-3 py-2 focus:outline-none text-gray-900 border-none ${
                  index === highlightedIndex 
                    ? 'bg-indigo-50 text-indigo-900' 
                    : 'hover:bg-gray-100 focus:bg-gray-100'
                }`}
              >
                {manager.manager_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

ManagerSearch.displayName = 'ManagerSearch'

export default ManagerSearch