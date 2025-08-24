import { useState, useCallback, useEffect } from 'react'
import { Manager } from '../types'

interface UseManagerSearchOptions {
  minQueryLength?: number
  onManagerSelect?: (manager: Manager) => void
  externalQuery?: string
  preloadedManagers?: Manager[]
}

interface UseManagerSearchReturn {
  query: string
  setQuery: (query: string) => void
  filteredManagers: Manager[]
  showSuggestions: boolean
  setShowSuggestions: (show: boolean) => void
  selectedManager: Manager | null
  setSelectedManager: (manager: Manager | null) => void
  highlightedIndex: number
  setHighlightedIndex: (index: number) => void
  loading: boolean
  error: string
  searchManagers: (query: string) => void
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleSuggestionClick: (manager: Manager) => void
  handleInputBlur: () => void
  handleInputFocus: () => void
  clearSearch: () => void
}

export function useManagerSearch(options: UseManagerSearchOptions = {}): UseManagerSearchReturn {
  const {
    minQueryLength = 1,
    onManagerSelect,
    externalQuery,
    preloadedManagers
  } = options

  const [query, setQuery] = useState(externalQuery || '')
  const [allManagers, setAllManagers] = useState<Manager[]>([])
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [managersLoaded, setManagersLoaded] = useState(false)

  // Load all managers once (or use preloaded if available)
  useEffect(() => {
    if (preloadedManagers !== undefined) {
      // We have preloaded managers (even if empty array), so use them and don't load from API
      setAllManagers(preloadedManagers)
      setManagersLoaded(true)
      setLoading(false)
    } else if (!managersLoaded) {
      // No preloaded managers provided, load from API
      loadManagers()
    }
  }, [managersLoaded, preloadedManagers]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadManagers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/managers')
      if (!response.ok) throw new Error('Failed to load managers')
      
      const data = await response.json()
      setAllManagers(data)
      setManagersLoaded(true)
    } catch (error) {
      console.error('Error loading managers:', error)
      setError('Failed to load managers')
      setAllManagers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const searchManagers = useCallback((searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setFilteredManagers([])
      setHighlightedIndex(0)
      return
    }

    const filtered = allManagers.filter(manager =>
      manager.manager_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    setFilteredManagers(filtered)
    setHighlightedIndex(0) // Auto-highlight first result
  }, [allManagers, minQueryLength])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    
    if (newQuery.trim().length >= minQueryLength) {
      searchManagers(newQuery.trim())
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
      setFilteredManagers([])
    }
  }, [minQueryLength, searchManagers])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmedQuery = query.trim()
      
      if (trimmedQuery.length < minQueryLength) return
      
      // If there are suggestions and one is highlighted, select it
      if (showSuggestions && filteredManagers.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredManagers.length) {
        const selectedManager = filteredManagers[highlightedIndex]
        setSelectedManager(selectedManager)
        setShowSuggestions(false)
        setQuery(selectedManager.manager_name)
        onManagerSelect?.(selectedManager)
        return
      }
      
      // Check for exact match
      const exactMatch = filteredManagers.find(manager => 
        manager.manager_name.toLowerCase() === trimmedQuery.toLowerCase()
      )
      
      if (exactMatch) {
        setSelectedManager(exactMatch)
        setShowSuggestions(false)
        onManagerSelect?.(exactMatch)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (showSuggestions && filteredManagers.length > 0) {
        setHighlightedIndex(prev => 
          prev < filteredManagers.length - 1 ? prev + 1 : 0
        )
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (showSuggestions && filteredManagers.length > 0) {
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredManagers.length - 1
        )
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlightedIndex(0)
    } else if (e.key === 'Tab') {
      // If there are suggestions, populate with the top result (highlighted one)
      if (showSuggestions && filteredManagers.length > 0) {
        const topResult = filteredManagers[highlightedIndex >= 0 && highlightedIndex < filteredManagers.length ? highlightedIndex : 0]
        setQuery(topResult.manager_name)
        setSelectedManager(topResult)
        setShowSuggestions(false)
        onManagerSelect?.(topResult)
        // Don't prevent default - let Tab continue to next field
      }
    }
  }, [query, minQueryLength, filteredManagers, onManagerSelect, showSuggestions, highlightedIndex])

  const handleSuggestionClick = useCallback((manager: Manager) => {
    setQuery(manager.manager_name)
    setSelectedManager(manager)
    setShowSuggestions(false)
    onManagerSelect?.(manager)
  }, [onManagerSelect])

  const handleInputBlur = useCallback(() => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
    }, 150)
  }, [])

  const handleInputFocus = useCallback(() => {
    if (query.trim().length >= minQueryLength && filteredManagers.length > 0) {
      setShowSuggestions(true)
    }
  }, [query, minQueryLength, filteredManagers.length])

  const clearSearch = useCallback(() => {
    setQuery('')
    setSelectedManager(null)
    setFilteredManagers([])
    setShowSuggestions(false)
    setError('')
  }, [])

  // Sync with external query
  useEffect(() => {
    if (externalQuery !== undefined) {
      setQuery(externalQuery)
      if (externalQuery.trim().length >= minQueryLength) {
        searchManagers(externalQuery.trim())
        // Only show suggestions if the query doesn't exactly match a manager name
        // This prevents showing suggestions after selection
        const exactMatch = allManagers.find(manager => 
          manager.manager_name.toLowerCase() === externalQuery.trim().toLowerCase()
        )
        if (!exactMatch) {
          setShowSuggestions(true)
        } else {
          setShowSuggestions(false)
        }
      } else {
        setShowSuggestions(false)
        setFilteredManagers([])
      }
    }
  }, [externalQuery, minQueryLength, searchManagers, allManagers])

  return {
    query,
    setQuery,
    filteredManagers,
    showSuggestions,
    setShowSuggestions,
    selectedManager,
    setSelectedManager,
    highlightedIndex,
    setHighlightedIndex,
    loading,
    error,
    searchManagers,
    handleInputChange,
    handleKeyDown,
    handleSuggestionClick,
    handleInputBlur,
    handleInputFocus,
    clearSearch
  }
}