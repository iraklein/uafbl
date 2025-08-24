'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from "../../../components/Header"
import ErrorAlert from "../../../components/ErrorAlert"
import LoadingState from "../../../components/LoadingState"

interface PlayerMapping {
  id: number
  name: string
  bbm_id: number | null
  bbm_name: string | null
  bbm_verified: boolean
  data_source: string | null
  bbm_matched_at: string | null
  notes: string | null
  yahoo_player_id: string | null
  yahoo_player_key: string | null
  yahoo_name_full: string | null
  yahoo_positions: string | null
  yahoo_team_abbr: string | null
  yahoo_verified: boolean
  yahoo_matched_at: string | null
}

export default function PlayerMappings() {
  const router = useRouter()
  const [players, setPlayers] = useState<PlayerMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Inline editing states
  const [editingBbmId, setEditingBbmId] = useState<number | null>(null)
  const [editingYahooId, setEditingYahooId] = useState<number | null>(null)
  const [bbmIdValue, setBbmIdValue] = useState('')
  const [yahooIdValue, setYahooIdValue] = useState('')
  const [saving, setSaving] = useState<number | null>(null)

  // Filter states
  const [filter, setFilter] = useState<'all' | 'bbm-only' | 'yahoo-only' | 'both' | 'none'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [seasonFilter, setSeasonFilter] = useState<'all' | '18'>('all')

  useEffect(() => {
    fetchPlayers()
  }, [seasonFilter])

  const fetchPlayers = async () => {
    try {
      const url = seasonFilter === '18'
        ? '/api/admin/bbm-mappings?season_id=18'  // 2024-25 season roster only
        : '/api/admin/bbm-mappings'               // All players
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch players')
      
      const data = await response.json()
      setPlayers(data.players || [])
    } catch (error) {
      console.error('Error fetching players:', error)
      setError('Failed to load player mappings')
    } finally {
      setLoading(false)
    }
  }

  const saveBbmId = async (playerId: number) => {
    setSaving(playerId)
    try {
      const bbmId = bbmIdValue ? parseInt(bbmIdValue) : null
      
      if (bbmIdValue && (isNaN(bbmId!) || bbmId! <= 0)) {
        setError('BBM ID must be a valid positive number')
        return
      }

      const response = await fetch('/api/admin/bbm-mappings/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          bbmId,
          bbmName: null, // Let API auto-fill from BBM data
          verified: false
        })
      })

      if (!response.ok) throw new Error('Failed to update BBM mapping')

      await fetchPlayers()
      setEditingBbmId(null)
      setBbmIdValue('')
      setError('')
    } catch (error) {
      console.error('Error saving BBM mapping:', error)
      setError('Failed to save BBM mapping')
    } finally {
      setSaving(null)
    }
  }

  const saveYahooId = async (playerId: number) => {
    setSaving(playerId)
    try {
      const response = await fetch('/api/admin/bbm-mappings/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          yahooPlayerId: yahooIdValue || null,
          yahooPlayerKey: null,
          yahooNameFull: null,
          yahooPositions: null,
          yahooTeamAbbr: null,
          yahooVerified: false
        })
      })

      if (!response.ok) throw new Error('Failed to update Yahoo mapping')

      // Auto-populate Yahoo data if we have a Yahoo ID
      if (yahooIdValue) {
        console.log(`🔄 Auto-populating Yahoo data for player ${playerId} with Yahoo ID ${yahooIdValue}`)
        
        try {
          const autoPopulateResponse = await fetch('/api/admin/yahoo-mappings/auto-populate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: playerId,
              yahooPlayerId: yahooIdValue
            })
          })

          if (autoPopulateResponse.ok) {
            const autoPopulateData = await autoPopulateResponse.json()
            console.log('✅ Auto-populated Yahoo data:', autoPopulateData.message)
          } else {
            console.warn('⚠️ Failed to auto-populate Yahoo data, but Yahoo ID was saved')
          }
        } catch (autoPopulateError) {
          console.error('Auto-populate error:', autoPopulateError)
          // Don't fail the main operation if auto-populate fails
        }
      }

      await fetchPlayers()
      setEditingYahooId(null)
      setYahooIdValue('')
      setError('')
    } catch (error) {
      console.error('Error saving Yahoo mapping:', error)
      setError('Failed to save Yahoo mapping')
    } finally {
      setSaving(null)
    }
  }

  const unmapPlayer = async (playerId: number) => {
    try {
      const response = await fetch('/api/admin/bbm-mappings/unmap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      })

      if (!response.ok) throw new Error('Failed to unmap player')

      await fetchPlayers()
    } catch (error) {
      console.error('Error unmapping player:', error)
      setError('Failed to unmap player')
    }
  }

  const startEditingBbmId = (player: PlayerMapping) => {
    setEditingBbmId(player.id)
    setBbmIdValue(player.bbm_id?.toString() || '')
    setError('')
  }

  const startEditingYahooId = (player: PlayerMapping) => {
    setEditingYahooId(player.id)
    setYahooIdValue(player.yahoo_player_id || '')
    setError('')
  }

  const cancelBbmEdit = () => {
    setEditingBbmId(null)
    setBbmIdValue('')
    setError('')
  }

  const cancelYahooEdit = () => {
    setEditingYahooId(null)
    setYahooIdValue('')
    setError('')
  }

  // Filter and search players
  const filteredPlayers = players.filter(player => {
    // Apply filter
    if (filter === 'bbm-only' && (!player.bbm_id || player.yahoo_player_id)) return false
    if (filter === 'yahoo-only' && (!player.yahoo_player_id || player.bbm_id)) return false
    if (filter === 'both' && (!player.bbm_id || !player.yahoo_player_id)) return false
    if (filter === 'none' && (player.bbm_id || player.yahoo_player_id)) return false
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        player.name.toLowerCase().includes(query) ||
        player.bbm_name?.toLowerCase().includes(query) ||
        player.bbm_id?.toString().includes(query) ||
        player.yahoo_name_full?.toLowerCase().includes(query) ||
        player.yahoo_player_id?.toLowerCase().includes(query) ||
        player.yahoo_team_abbr?.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  // Statistics
  const bbmMappedCount = players.filter(p => p.bbm_id !== null).length
  const yahooMappedCount = players.filter(p => p.yahoo_player_id !== null).length
  const bothMappedCount = players.filter(p => p.bbm_id !== null && p.yahoo_player_id !== null).length
  const unmappedCount = players.filter(p => !p.bbm_id && !p.yahoo_player_id).length

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />

        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="text-sm" aria-label="Breadcrumb">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.back()}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Admin Panel
              </button>
              <span className="text-gray-500">/</span>
              <span className="text-gray-900 font-medium">Player ID Mappings</span>
            </div>
          </nav>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Player ID Mappings</h2>
          <p className="text-gray-600 mb-4">
            Manage Basketball Monster (BBM) and Yahoo Fantasy player ID mappings for enhanced cross-platform player identification.
          </p>

          {/* Statistics */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{players.length}</div>
              <div className="text-sm text-gray-500">Total Players</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">{bbmMappedCount}</div>
              <div className="text-sm text-gray-500">BBM IDs</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-yellow-600">{yahooMappedCount}</div>
              <div className="text-sm text-gray-500">Yahoo IDs</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{bothMappedCount}</div>
              <div className="text-sm text-gray-500">Both Systems</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{unmappedCount}</div>
              <div className="text-sm text-gray-500">No Mappings</div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Season:</label>
              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Players</option>
                <option value="18">2024-25 Roster Only</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Players</option>
                <option value="bbm-only">BBM Only</option>
                <option value="yahoo-only">Yahoo Only</option>
                <option value="both">Both Systems</option>
                <option value="none">No Mappings</option>
              </select>
            </div>
            
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by name, BBM ID, or Yahoo ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <ErrorAlert error={error} />

        {loading ? (
          <LoadingState message="Loading player mappings..." />
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {filteredPlayers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500 mb-4">
                  {searchQuery || filter !== 'all' 
                    ? 'No players match your search criteria'
                    : 'No players found'
                  }
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        UAFBL ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        UAFBL Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        BBM ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        BBM Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Yahoo ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Yahoo Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPlayers.map((player) => (
                      <tr key={player.id} className={(player.bbm_id || player.yahoo_player_id) ? 'bg-green-50' : ''}>
                        {/* UAFBL ID */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900">
                            {player.id}
                          </div>
                        </td>
                        
                        {/* UAFBL Name */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {player.name}
                          </div>
                        </td>
                        
                        {/* BBM ID - Inline Editable */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingBbmId === player.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={bbmIdValue}
                                onChange={(e) => setBbmIdValue(e.target.value)}
                                placeholder="BBM ID"
                                className="w-20 px-2 py-1 border border-blue-300 rounded text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={() => saveBbmId(player.id)}
                                disabled={saving === player.id}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {saving === player.id ? '...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelBbmEdit}
                                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div 
                              className="text-sm cursor-pointer hover:bg-blue-100 px-2 py-1 rounded"
                              onClick={() => startEditingBbmId(player)}
                              title="Click to edit BBM ID"
                            >
                              {player.bbm_id ? (
                                <span className="font-mono text-gray-900">{player.bbm_id}</span>
                              ) : (
                                <span className="text-gray-400 italic">Click to add BBM ID</span>
                              )}
                            </div>
                          )}
                        </td>
                        
                        {/* BBM Name - Read Only (auto-filled) */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {player.bbm_name ? (
                              <span className="text-gray-900">{player.bbm_name}</span>
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </div>
                        </td>
                        
                        {/* Yahoo ID - Inline Editable */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingYahooId === player.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={yahooIdValue}
                                onChange={(e) => setYahooIdValue(e.target.value)}
                                placeholder="Yahoo ID"
                                className="w-20 px-2 py-1 border border-blue-300 rounded text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={() => saveYahooId(player.id)}
                                disabled={saving === player.id}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {saving === player.id ? '...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelYahooEdit}
                                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div 
                              className="text-sm cursor-pointer hover:bg-blue-100 px-2 py-1 rounded"
                              onClick={() => startEditingYahooId(player)}
                              title="Click to edit Yahoo ID"
                            >
                              {player.yahoo_player_id ? (
                                <span className="font-mono text-gray-900">{player.yahoo_player_id}</span>
                              ) : (
                                <span className="text-gray-400 italic">Click to add Yahoo ID</span>
                              )}
                            </div>
                          )}
                        </td>
                        
                        {/* Yahoo Name - Read Only */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {player.yahoo_name_full ? (
                              <span className="text-gray-900">{player.yahoo_name_full}</span>
                            ) : (
                              <span className="text-gray-400 italic">-</span>
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
        )}
      </div>
    </div>
  )
}