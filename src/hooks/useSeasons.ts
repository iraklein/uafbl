import { useState, useEffect } from 'react'
import { Season } from '../types'

interface UseSeasonsOptions {
  autoSelectDefault?: boolean
  filterFunction?: (seasons: Season[]) => Season[]
  defaultSeasonFilter?: 'latest' | '2024-25' | 'first' | 'active_playing' | 'active_assets'
}

interface UseSeasonsReturn {
  seasons: Season[]
  selectedSeason: string
  setSelectedSeason: (seasonId: string) => void
  loading: boolean
  error: string
  clearError: () => void
}

export function useSeasons(options: UseSeasonsOptions = {}): UseSeasonsReturn {
  const {
    autoSelectDefault = true,
    filterFunction,
    defaultSeasonFilter = '2024-25'
  } = options

  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const clearError = () => setError('')

  useEffect(() => {
    async function fetchSeasons() {
      try {
        setLoading(true)
        setError('')
        
        const response = await fetch('/api/seasons')
        if (!response.ok) throw new Error('Failed to fetch seasons')
        
        let data = await response.json()
        
        // Apply custom filter if provided
        if (filterFunction) {
          data = filterFunction(data)
        }
        
        setSeasons(data)
        
        // Auto-select default season if enabled
        if (autoSelectDefault && data.length > 0) {
          let defaultSeason: Season | undefined

          switch (defaultSeasonFilter) {
            case 'active_playing':
              defaultSeason = data.find((season: Season) => season.is_active === true)
              if (!defaultSeason) {
                defaultSeason = data[0] // Fallback to first season
              }
              break
            case 'active_assets':
              defaultSeason = data.find((season: Season) => season.is_active_assets === true)
              if (!defaultSeason) {
                defaultSeason = data[data.length - 1] // Fallback to latest season
              }
              break
            case '2024-25':
              defaultSeason = data.find((season: Season) => 
                season.name.includes('2024-25') || season.year === 2024
              )
              if (!defaultSeason) {
                defaultSeason = data[0] // Fallback to first season
              }
              break
            case 'latest':
              defaultSeason = data[0]
              break
            case 'first':
              defaultSeason = data[data.length - 1]
              break
            default:
              defaultSeason = data[0]
          }

          if (defaultSeason) {
            setSelectedSeason(defaultSeason.id.toString())
          }
        }
      } catch (error) {
        console.error('Error fetching seasons:', error)
        setError('Failed to load seasons')
      } finally {
        setLoading(false)
      }
    }

    fetchSeasons()
  }, [autoSelectDefault, defaultSeasonFilter, filterFunction])

  return {
    seasons,
    selectedSeason,
    setSelectedSeason,
    loading,
    error,
    clearError
  }
}