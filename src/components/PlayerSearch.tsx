import { usePlayerSearch } from '../hooks/usePlayerSearch'
import { Player } from '../types'
import LoadingState from './LoadingState'
import ErrorAlert from './ErrorAlert'

interface PlayerSearchProps {
  onPlayerSelect?: (player: Player) => void
  onExactMatch?: (player: Player) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowCreateNew?: boolean
  minQueryLength?: number
  showSearchButton?: boolean
  searchButtonText?: string
  onSearchButtonClick?: () => void
  searchButtonLoading?: boolean
  value?: string
  onChange?: (value: string) => void
}

export default function PlayerSearch({
  onPlayerSelect,
  onExactMatch,
  placeholder = "Enter player name...",
  className = "",
  disabled = false,
  allowCreateNew = false,
  minQueryLength = 2,
  showSearchButton = false,
  searchButtonText = "Search",
  onSearchButtonClick,
  searchButtonLoading = false,
  value,
  onChange
}: PlayerSearchProps) {
  const {
    query,
    setQuery,
    filteredPlayers,
    showSuggestions,
    setShowSuggestions,
    highlightedIndex,
    loading,
    error,
    isSelectingPlayer,
    handleInputChange,
    handleKeyDown,
    handleSuggestionClick,
    handleInputBlur,
    handleInputFocus
  } = usePlayerSearch({
    minQueryLength,
    onPlayerSelect,
    onExactMatch,
    allowCreateNew,
    externalQuery: value,
    onChange
  })

  // Use controlled value if provided, but ensure autocomplete still works
  const inputValue = value !== undefined ? value : query
  const handleChange = value !== undefined && onChange 
    ? (e: React.ChangeEvent<HTMLInputElement>) => {
        // Update external state first
        onChange(e.target.value)
        
        // Then update internal state for autocomplete
        setQuery(e.target.value)
        
        // Only trigger search if we're not in the middle of selecting a player
        if (!isSelectingPlayer) {
          const newQuery = e.target.value
          if (newQuery.trim().length >= minQueryLength) {
            handleInputChange(e)
          } else {
            setShowSuggestions(false)
          }
        }
      }
    : handleInputChange

  return (
    <div className={`relative ${className}`}>
      <ErrorAlert error={error} className="mb-2" />
      
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={disabled}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
            autoComplete="off"
          />
          
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
          )}
          
          {/* Autocomplete Dropdown */}
          {showSuggestions && filteredPlayers.length > 0 && !disabled && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
              {filteredPlayers.map((player, index) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => handleSuggestionClick(player)}
                  className={`w-full text-left px-3 py-2 focus:outline-none text-gray-900 border-none ${
                    index === highlightedIndex 
                      ? 'bg-indigo-50 text-indigo-900' 
                      : 'hover:bg-gray-100 focus:bg-gray-100'
                  }`}
                >
                  {player.name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {showSearchButton && (
          <button
            onClick={onSearchButtonClick}
            disabled={searchButtonLoading || disabled}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searchButtonLoading ? 'Searching...' : searchButtonText}
          </button>
        )}
      </div>
      
      {allowCreateNew && inputValue && filteredPlayers.length === 0 && !loading && (
        <div className="mt-2 text-sm text-gray-600">
          Press Enter to create new player: <strong>{inputValue}</strong>
        </div>
      )}
    </div>
  )
}