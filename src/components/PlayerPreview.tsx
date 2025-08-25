import { useState, useEffect, useRef } from 'react'

// Simple cache to avoid repeated API calls for the same player
const playerDataCache = new Map<number, any>()

interface Player {
  id: number
  name: string
  yahoo_image_url?: string | null
  yahoo_name_full?: string | null
  yahoo_team_abbr?: string | null
  yahoo_positions?: string | null
}

interface DraftHistoryEntry {
  season_id: number
  season_name: string
  manager_name: string
  team_name?: string | null
  draft_price: number
  is_keeper: boolean
  is_topper: boolean
  is_bottom?: boolean
  bottom_manager_id?: number | null
  topper_managers?: string[]
}

interface TopperHistoryEntry {
  id: number
  season_id: number
  is_winner: boolean
  is_unused: boolean
  seasons: {
    year: number
    name: string
  }
  managers: {
    manager_name: string
  }
}

interface LSLHistoryEntry {
  id: number
  year: number
  draft_price: number
  status: string
  original_managers: {
    manager_name: string
  }
  draft_managers: {
    manager_name: string
  }
}

interface PlayerPreviewProps {
  player: Player
  className?: string
}

export default function PlayerPreview({ player, className = '' }: PlayerPreviewProps) {
  const [draftHistory, setDraftHistory] = useState<DraftHistoryEntry[]>([])
  const [topperHistory, setTopperHistory] = useState<TopperHistoryEntry[]>([])
  const [lslHistory, setLslHistory] = useState<LSLHistoryEntry[]>([])
  const [managersMap, setManagersMap] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const lastPlayerIdRef = useRef<number | null>(null)

  useEffect(() => {
    const fetchDraftHistory = async () => {
      if (!player.id) return
      
      // Skip if same player to avoid unnecessary re-renders
      if (lastPlayerIdRef.current === player.id) return
      lastPlayerIdRef.current = player.id
      
      // Check cache first
      if (playerDataCache.has(player.id)) {
        const cachedData = playerDataCache.get(player.id)
        setDraftHistory(cachedData.draft_history || [])
        setTopperHistory(cachedData.topperHistory || [])
        setLslHistory(cachedData.lslHistory || [])
        setManagersMap(cachedData.managersMap || {})
        setLoading(false)
        setError('')
        return
      }
      
      setLoading(true)
      setError('')
      
      try {
        const response = await fetch(`/api/player-history?player_id=${player.id}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch draft history: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        
        // Cache the response
        playerDataCache.set(player.id, data)
        
        setDraftHistory(data.draft_history || [])
        setTopperHistory(data.topperHistory || [])
        setLslHistory(data.lslHistory || [])
        setManagersMap(data.managersMap || {})
      } catch (error) {
        console.error('Error fetching draft history:', error)
        setError('Failed to load draft history')
      } finally {
        setLoading(false)
      }
    }

    fetchDraftHistory()
  }, [player.id])

  if (!player) return null

  // Filter toppers to only include used toppers (regardless of winner status)
  const validToppers = topperHistory.filter(topper => !topper.is_unused)
  
  // Calculate total draft dollars spent and AADP
  const totalDraftDollars = draftHistory.reduce((total, entry) => total + (entry.draft_price || 0), 0)
  const aadp = draftHistory.length > 0 ? (totalDraftDollars / draftHistory.length).toFixed(1) : '0.0'
  
  // Calculate bottom count
  const bottomCount = draftHistory.filter(entry => entry.is_bottom).length

  // Helper function to check if player was topped in a specific season (using valid toppers only)
  const wasPlayerTopped = (seasonId: number): boolean => {
    return validToppers.some(topper => topper.season_id === seasonId)
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 shadow-sm ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Player Info */}
        <div className="flex flex-col items-center space-y-4">
          {/* Player Headshot - Larger */}
          <div className="flex-shrink-0">
            {player.yahoo_image_url ? (
              <img
                src={player.yahoo_image_url}
                alt={player.yahoo_name_full || player.name}
                className="w-24 h-24 rounded-lg object-cover border border-gray-200 shadow-md"
                onError={(e) => {
                  // Hide image if it fails to load
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 shadow-md">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* Player Name and Details - Larger */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-gray-900">
              {player.yahoo_name_full || player.name}
            </h3>
            {player.yahoo_team_abbr && (
              <div className="flex items-center justify-center space-x-3 text-lg text-gray-700">
                <span className="font-semibold bg-gray-100 px-3 py-1 rounded-full">{player.yahoo_team_abbr}</span>
                {player.yahoo_positions && (
                  <span className="font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{player.yahoo_positions}</span>
                )}
              </div>
            )}
            
            {/* Summary Stats - Individual Buttons */}
            <div className="flex items-center justify-center space-x-2 flex-wrap">
              <span className="font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {draftHistory.length} draft{draftHistory.length !== 1 ? 's' : ''}
              </span>
              <span className="font-medium bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                ${totalDraftDollars} total
              </span>
              <span className="font-medium bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                ${aadp} AADP
              </span>
              <span className="font-medium bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                {validToppers.length} topper{validToppers.length !== 1 ? 's' : ''}
              </span>
              {bottomCount > 0 && (
                <span className="font-medium bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                  {bottomCount} bottom{bottomCount !== 1 ? 's' : ''}
                </span>
              )}
              {lslHistory.length > 0 && (
                <span className="font-medium bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                  LSL - {lslHistory[0].year}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Draft History Table */}
        <div className="flex flex-col">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Draft History</h4>
          
          {loading ? (
            <div className="text-gray-500 text-center py-8">Loading draft history...</div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : draftHistory.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No previous draft history</div>
          ) : (
            <div className="bg-gray-50 rounded-lg overflow-hidden border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Season
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {draftHistory.map((entry, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.season_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {entry.manager_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                        ${entry.draft_price}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {entry.is_keeper && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">K</span>
                          )}
                          {wasPlayerTopped(entry.season_id) && (
                            <span className="text-sm">🎩</span>
                          )}
                          {entry.is_bottom && (
                            <span className="text-sm">
                              🍑 <span className="text-gray-900">({entry.bottom_manager_id && managersMap[entry.bottom_manager_id] 
                                ? managersMap[entry.bottom_manager_id].manager_name 
                                : 'Unknown'})</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}