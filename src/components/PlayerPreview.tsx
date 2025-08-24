import { useState, useEffect } from 'react'

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
  topper_managers?: string[]
}

interface PlayerPreviewProps {
  player: Player
  className?: string
}

export default function PlayerPreview({ player, className = '' }: PlayerPreviewProps) {
  const [draftHistory, setDraftHistory] = useState<DraftHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDraftHistory = async () => {
      if (!player.id) return
      
      setLoading(true)
      setError('')
      
      try {
        const response = await fetch(`/api/player-history?player_id=${player.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch draft history')
        }
        
        const data = await response.json()
        setDraftHistory(data.draftHistory || [])
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

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-start space-x-4">
        {/* Player Headshot */}
        <div className="flex-shrink-0">
          {player.yahoo_image_url ? (
            <img
              src={player.yahoo_image_url}
              alt={player.yahoo_name_full || player.name}
              className="w-16 h-16 rounded-lg object-cover border border-gray-200"
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Player Info and Draft History */}
        <div className="flex-1 min-w-0">
          {/* Player Name and Details */}
          <div className="mb-3">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {player.yahoo_name_full || player.name}
            </h3>
            {player.yahoo_team_abbr && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                <span className="font-medium">{player.yahoo_team_abbr}</span>
                {player.yahoo_positions && (
                  <>
                    <span>•</span>
                    <span>{player.yahoo_positions}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Draft History */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Draft History</h4>
            
            {loading ? (
              <div className="text-sm text-gray-500">Loading draft history...</div>
            ) : error ? (
              <div className="text-sm text-red-500">{error}</div>
            ) : draftHistory.length === 0 ? (
              <div className="text-sm text-gray-500">No previous draft history</div>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {draftHistory.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{entry.season_name}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-700">{entry.manager_name}</span>
                      {entry.is_keeper && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs font-bold">K</span>
                      )}
                      {entry.is_topper && (
                        <span className="text-xs">🎩</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">${entry.draft_price}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}