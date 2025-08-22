import { useState, useCallback, useEffect } from 'react'
import { Player } from '../types'

interface UsePlayerSearchOptions {
  minQueryLength?: number
  debounceMs?: number
  onPlayerSelect?: (player: Player) => void
  onExactMatch?: (player: Player) => void
  allowCreateNew?: boolean
  externalQuery?: string
  onChange?: (value: string) => void
}

interface UsePlayerSearchReturn {
  query: string
  setQuery: (query: string) => void
  filteredPlayers: Player[]
  showSuggestions: boolean
  setShowSuggestions: (show: boolean) => void
  selectedPlayer: Player | null
  setSelectedPlayer: (player: Player | null) => void
  highlightedIndex: number
  setHighlightedIndex: (index: number) => void
  loading: boolean
  error: string
  isSelectingPlayer: boolean
  searchPlayers: (query: string) => Promise<void>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleSuggestionClick: (player: Player) => void
  handleInputBlur: () => void
  handleInputFocus: () => void
  clearSearch: () => void
}

export function usePlayerSearch(options: UsePlayerSearchOptions = {}): UsePlayerSearchReturn {
  const {
    minQueryLength = 2,
    debounceMs = 300,
    onPlayerSelect,
    onExactMatch,
    allowCreateNew = false,
    externalQuery,
    onChange
  } = options

  const [query, setQuery] = useState(externalQuery || '')
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSelectingPlayer, setIsSelectingPlayer] = useState(false)

  const searchPlayers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setFilteredPlayers([])
      setHighlightedIndex(0)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) throw new Error('Failed to search players')
      
      const data = await response.json()
      setFilteredPlayers(data)
      setHighlightedIndex(0) // Auto-highlight first result
    } catch (error) {
      console.error('Error searching players:', error)
      setError('Failed to search players')
      setFilteredPlayers([])
      setHighlightedIndex(0)
    } finally {
      setLoading(false)
    }
  }, [minQueryLength])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    
    if (newQuery.trim().length >= minQueryLength) {
      searchPlayers(newQuery.trim())
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
      setFilteredPlayers([])
    }
  }, [minQueryLength, searchPlayers])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmedQuery = query.trim()
      
      if (trimmedQuery.length < minQueryLength) return
      
      // If there are suggestions, always select the top result (first item or highlighted item)
      if (showSuggestions && filteredPlayers.length > 0) {
        const indexToSelect = (highlightedIndex >= 0 && highlightedIndex < filteredPlayers.length) ? highlightedIndex : 0
        const selectedPlayer = filteredPlayers[indexToSelect]
        setIsSelectingPlayer(true)
        setSelectedPlayer(selectedPlayer)
        setShowSuggestions(false)
        setQuery(selectedPlayer.name)
        onChange?.(selectedPlayer.name) // Update external controlled state
        onPlayerSelect?.(selectedPlayer)
        // Reset the flag after a brief delay
        setTimeout(() => setIsSelectingPlayer(false), 100)
        return
      }
      
      // Check for exact match
      const exactMatch = filteredPlayers.find(player => 
        player.name.toLowerCase() === trimmedQuery.toLowerCase()
      )
      
      if (exactMatch) {
        setSelectedPlayer(exactMatch)
        setShowSuggestions(false)
        onChange?.(exactMatch.name) // Update external controlled state
        onExactMatch?.(exactMatch)
        onPlayerSelect?.(exactMatch)
      } else if (allowCreateNew && trimmedQuery.length > 0) {
        // Handle create new player logic
        const newPlayer: Player = {
          id: -1, // Temporary ID for new players
          name: trimmedQuery
        }
        setSelectedPlayer(newPlayer)
        setShowSuggestions(false)
        onExactMatch?.(newPlayer)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (showSuggestions && filteredPlayers.length > 0) {
        setHighlightedIndex(prev => 
          prev < filteredPlayers.length - 1 ? prev + 1 : 0
        )
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (showSuggestions && filteredPlayers.length > 0) {
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredPlayers.length - 1
        )
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlightedIndex(0)
    } else if (e.key === 'Tab') {
      // If there are suggestions, populate with the top result (highlighted one)
      if (showSuggestions && filteredPlayers.length > 0) {
        const topResult = filteredPlayers[highlightedIndex >= 0 && highlightedIndex < filteredPlayers.length ? highlightedIndex : 0]
        setIsSelectingPlayer(true)
        setQuery(topResult.name)
        setSelectedPlayer(topResult)
        setShowSuggestions(false)
        onChange?.(topResult.name) // Update external controlled state
        onPlayerSelect?.(topResult)
        // Reset the flag after a brief delay
        setTimeout(() => setIsSelectingPlayer(false), 100)
        // Don't prevent default - let Tab continue to next field
      }
    }
  }, [query, minQueryLength, filteredPlayers, allowCreateNew, onExactMatch, onPlayerSelect, showSuggestions, highlightedIndex, onChange])

  const handleSuggestionClick = useCallback((player: Player) => {
    setIsSelectingPlayer(true)
    setQuery(player.name)
    setSelectedPlayer(player)
    setShowSuggestions(false)
    onChange?.(player.name) // Update external controlled state
    onPlayerSelect?.(player)
    // Reset the flag after a brief delay
    setTimeout(() => setIsSelectingPlayer(false), 100)
  }, [onPlayerSelect, onChange])

  const handleInputBlur = useCallback(() => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
    }, 150)
  }, [])

  const handleInputFocus = useCallback(() => {
    if (query.trim().length >= minQueryLength && filteredPlayers.length > 0) {
      setShowSuggestions(true)
    }
  }, [query, minQueryLength, filteredPlayers.length])

  const clearSearch = useCallback(() => {
    setQuery('')
    setSelectedPlayer(null)
    setFilteredPlayers([])
    setShowSuggestions(false)
    setError('')
  }, [])

  // Sync with external query
  useEffect(() => {
    if (externalQuery !== undefined) {
      setQuery(externalQuery)
      if (externalQuery.trim().length >= minQueryLength) {
        searchPlayers(externalQuery.trim())
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
        setFilteredPlayers([])
      }
    }
  }, [externalQuery, minQueryLength, searchPlayers])

  return {
    query,
    setQuery,
    filteredPlayers,
    showSuggestions,
    setShowSuggestions,
    selectedPlayer,
    setSelectedPlayer,
    highlightedIndex,
    setHighlightedIndex,
    loading,
    error,
    isSelectingPlayer,
    searchPlayers,
    handleInputChange,
    handleKeyDown,
    handleSuggestionClick,
    handleInputBlur,
    handleInputFocus,
    clearSearch
  }
}