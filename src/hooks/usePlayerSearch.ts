import { useState, useCallback, useEffect, useRef } from 'react'
import { Player } from '../types'

interface UsePlayerSearchOptions {
  minQueryLength?: number
  debounceMs?: number
  onPlayerSelect?: (player: Player) => void
  onExactMatch?: (player: Player) => void
  allowCreateNew?: boolean
  externalQuery?: string
  onChange?: (value: string) => void
  excludePlayerIds?: number[]
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
    onChange,
    excludePlayerIds = []
  } = options

  const [query, setQuery] = useState(externalQuery || '')
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSelectingPlayer, setIsSelectingPlayer] = useState(false)
  const lastSelectedPlayerNameRef = useRef<string>('')
  const lastExternalQueryRef = useRef<string>('')

  const searchPlayers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setFilteredPlayers([])
      setHighlightedIndex(0)
      return
    }

    // Don't search if this is exactly the same as the last selected player name
    if (searchQuery.trim() === lastSelectedPlayerNameRef.current.trim()) {
      setFilteredPlayers([])
      setHighlightedIndex(0)
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) throw new Error('Failed to search players')
      
      const data = await response.json()
      // Filter out excluded player IDs
      const filteredData = data.filter((player: Player) => !excludePlayerIds.includes(player.id))
      setFilteredPlayers(filteredData)
      setHighlightedIndex(0) // Auto-highlight first result
    } catch (error) {
      console.error('Error searching players:', error)
      setError('Failed to search players')
      setFilteredPlayers([])
      setHighlightedIndex(0)
    } finally {
      setLoading(false)
    }
  }, [minQueryLength, excludePlayerIds])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    
    // If the user is typing something different from the last selected player, clear the ref
    if (newQuery.trim() !== lastSelectedPlayerNameRef.current.trim()) {
      lastSelectedPlayerNameRef.current = ''
    }
    
    // Don't search if we're currently selecting a player
    if (isSelectingPlayer) {
      return
    }
    
    if (newQuery.trim().length >= minQueryLength) {
      searchPlayers(newQuery.trim())
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
      setFilteredPlayers([])
    }
  }, [minQueryLength, searchPlayers, isSelectingPlayer])

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
        setFilteredPlayers([]) // Clear suggestions to prevent re-showing
        setHighlightedIndex(0) // Reset highlighted index
        setQuery(selectedPlayer.name)
        lastSelectedPlayerNameRef.current = selectedPlayer.name // Track the selected player name
        onChange?.(selectedPlayer.name) // Update external controlled state
        onPlayerSelect?.(selectedPlayer)
        // Reset the flag after a longer delay to ensure everything settles
        setTimeout(() => {
          setIsSelectingPlayer(false)
          // Force clear suggestions one more time to be absolutely sure
          setShowSuggestions(false)
          setFilteredPlayers([])
        }, 500)
        return
      }
      
      // Check for exact match
      const exactMatch = filteredPlayers.find(player => 
        player.name.toLowerCase() === trimmedQuery.toLowerCase()
      )
      
      if (exactMatch) {
        setSelectedPlayer(exactMatch)
        setShowSuggestions(false)
        lastSelectedPlayerNameRef.current = exactMatch.name // Track the selected player name
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
        lastSelectedPlayerNameRef.current = newPlayer.name // Track the selected player name
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
        setFilteredPlayers([]) // Clear suggestions to prevent re-showing
        setHighlightedIndex(0) // Reset highlighted index
        lastSelectedPlayerNameRef.current = topResult.name // Track the selected player name
        onChange?.(topResult.name) // Update external controlled state
        onPlayerSelect?.(topResult)
        // Reset the flag after a longer delay to ensure everything settles
        setTimeout(() => {
          setIsSelectingPlayer(false)
          // Force clear suggestions one more time to be absolutely sure
          setShowSuggestions(false)
          setFilteredPlayers([])
        }, 500)
        // Don't prevent default - let Tab continue to next field
      }
    }
  }, [query, minQueryLength, filteredPlayers, allowCreateNew, onExactMatch, onPlayerSelect, showSuggestions, highlightedIndex, onChange])

  const handleSuggestionClick = useCallback((player: Player) => {
    setIsSelectingPlayer(true)
    setQuery(player.name)
    setSelectedPlayer(player)
    setShowSuggestions(false)
    setFilteredPlayers([]) // Clear suggestions to prevent re-showing
    setHighlightedIndex(0) // Reset highlighted index
    lastSelectedPlayerNameRef.current = player.name // Track the selected player name
    onChange?.(player.name) // Update external controlled state
    onPlayerSelect?.(player)
    // Reset the flag after a longer delay to ensure everything settles
    setTimeout(() => {
      setIsSelectingPlayer(false)
      // Force clear suggestions one more time to be absolutely sure
      setShowSuggestions(false)
      setFilteredPlayers([])
    }, 500)
  }, [onPlayerSelect, onChange])

  const handleInputBlur = useCallback(() => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
    }, 150)
  }, [])

  const handleInputFocus = useCallback(() => {
    // Don't show suggestions if we just selected a player or if there's no meaningful query
    if (isSelectingPlayer || query.trim().length < minQueryLength) {
      return
    }
    // Only show suggestions if we have results and haven't just selected a player
    if (filteredPlayers.length > 0) {
      setShowSuggestions(true)
    }
  }, [query, minQueryLength, filteredPlayers.length, isSelectingPlayer])

  const clearSearch = useCallback(() => {
    setQuery('')
    setSelectedPlayer(null)
    setFilteredPlayers([])
    setShowSuggestions(false)
    setError('')
    lastSelectedPlayerNameRef.current = '' // Clear the tracking ref
  }, [])

  // Sync with external query
  useEffect(() => {
    if (externalQuery !== undefined && !isSelectingPlayer && externalQuery !== lastExternalQueryRef.current) {
      lastExternalQueryRef.current = externalQuery
      setQuery(externalQuery)
      
      const trimmedQuery = externalQuery.trim()
      
      if (trimmedQuery.length >= minQueryLength) {
        // Don't search if this is exactly the same as the last selected player name
        if (trimmedQuery !== lastSelectedPlayerNameRef.current.trim()) {
          // Inline search logic to avoid dependency issues
          setLoading(true)
          setError('')
          
          fetch(`/api/players/search?q=${encodeURIComponent(trimmedQuery)}`)
            .then(response => {
              if (!response.ok) throw new Error('Failed to search players')
              return response.json()
            })
            .then(data => {
              // Filter out excluded player IDs
              const filteredData = data.filter((player: Player) => !excludePlayerIds.includes(player.id))
              setFilteredPlayers(filteredData)
              setHighlightedIndex(0)
              setShowSuggestions(true)
            })
            .catch(error => {
              console.error('Error searching players:', error)
              setError('Failed to search players')
              setFilteredPlayers([])
              setHighlightedIndex(0)
            })
            .finally(() => {
              setLoading(false)
            })
        }
      } else {
        setShowSuggestions(false)
        setFilteredPlayers([])
      }
    }
  }, [externalQuery, minQueryLength, isSelectingPlayer, excludePlayerIds])

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