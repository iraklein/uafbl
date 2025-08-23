'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from "../../../components/Header"
import ErrorAlert from "../../../components/ErrorAlert"
import LoadingState from "../../../components/LoadingState"
import PlayerSearch from "../../../components/PlayerSearch"

interface YahooPlayerMapping {
  id: number
  yahoo_player_id: string
  yahoo_player_key: string
  uafbl_player_id: number | null
  yahoo_name_full: string
  yahoo_name_first: string | null
  yahoo_name_last: string | null
  yahoo_positions: string
  yahoo_team_abbr: string | null
  yahoo_team_full: string | null
  yahoo_uniform_number: string | null
  yahoo_image_url: string | null
  is_verified: boolean
  uafbl_player_name?: string
  created_at: string
  updated_at: string
}

interface Player {
  id: number
  name: string
}

interface MappingSuggestion {
  yahoo_mapping_id: number
  yahoo_name: string
  uafbl_player_id: number
  uafbl_name: string
  confidence: number
}

export default function YahooPlayerMappings() {
  const router = useRouter()
  const [mappings, setMappings] = useState<YahooPlayerMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Editing states
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')

  // Auto-mapping states
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([])
  const [approvedSuggestions, setApprovedSuggestions] = useState<Set<number>>(new Set())
  const [autoMapLoading, setAutoMapLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    fetchMappings()
  }, [])

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/admin/yahoo-mappings')
      if (!response.ok) throw new Error('Failed to fetch mappings')
      
      const data = await response.json()
      setMappings(data.mappings || [])
    } catch (error) {
      console.error('Error fetching mappings:', error)
      setError('Failed to load Yahoo player mappings')
    } finally {
      setLoading(false)
    }
  }

  const importTopPlayers = async (start = 0, count = 25) => {
    setImportLoading(true)
    setImportResult('')

    try {
      const response = await fetch('/api/admin/yahoo-mappings/import-top-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, count })
      })

      const data = await response.json()

      if (response.ok) {
        setImportResult(`✅ ${data.message}`)
        await fetchMappings() // Refresh the list
      } else {
        setImportResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error importing players:', error)
      setImportResult('❌ Failed to import top players')
    } finally {
      setImportLoading(false)
    }
  }

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player)
    setPlayerSearchQuery(player.name)
  }

  const saveMapping = async (mappingId: number) => {
    if (!selectedPlayer) return

    try {
      const response = await fetch('/api/admin/yahoo-mappings/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: mappingId,
          uafbl_player_id: selectedPlayer.id
        })
      })

      if (!response.ok) throw new Error('Failed to update mapping')

      await fetchMappings() // Refresh the list
      setEditingId(null)
      setSelectedPlayer(null)
      setPlayerSearchQuery('')
    } catch (error) {
      console.error('Error saving mapping:', error)
      setError('Failed to save mapping')
    }
  }


  const unmapPlayer = async (mappingId: number) => {
    try {
      const response = await fetch('/api/admin/yahoo-mappings/unmap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mappingId })
      })

      if (!response.ok) throw new Error('Failed to unmap player')

      await fetchMappings() // Refresh the list
    } catch (error) {
      console.error('Error unmapping player:', error)
      setError('Failed to unmap player')
    }
  }

  const startEditing = (mappingId: number) => {
    setEditingId(mappingId)
    setSelectedPlayer(null)
    setPlayerSearchQuery('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setSelectedPlayer(null)
    setPlayerSearchQuery('')
  }

  const generateAutoMappings = async () => {
    setAutoMapLoading(true)
    setImportResult('')

    try {
      const response = await fetch('/api/admin/yahoo-mappings/auto-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        setSuggestions(data.suggestions || [])
        setShowSuggestions(true)
        setImportResult(`✅ Generated ${data.suggestions?.length || 0} mapping suggestions`)
      } else {
        setImportResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error generating auto mappings:', error)
      setImportResult('❌ Failed to generate mapping suggestions')
    } finally {
      setAutoMapLoading(false)
    }
  }

  const toggleSuggestion = (suggestionIndex: number) => {
    const newApproved = new Set(approvedSuggestions)
    if (newApproved.has(suggestionIndex)) {
      newApproved.delete(suggestionIndex)
    } else {
      newApproved.add(suggestionIndex)
    }
    setApprovedSuggestions(newApproved)
  }

  const applyApprovedSuggestions = async () => {
    if (approvedSuggestions.size === 0) return

    setAutoMapLoading(true)
    
    const suggestionsToApply = Array.from(approvedSuggestions).map(index => suggestions[index])

    try {
      const response = await fetch('/api/admin/yahoo-mappings/apply-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedSuggestions: suggestionsToApply })
      })

      const data = await response.json()

      if (response.ok) {
        setImportResult(`✅ ${data.message}`)
        await fetchMappings() // Refresh the main list
        setShowSuggestions(false) // Hide suggestions
        setSuggestions([])
        setApprovedSuggestions(new Set())
      } else {
        setImportResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error applying suggestions:', error)
      setImportResult('❌ Failed to apply mapping suggestions')
    } finally {
      setAutoMapLoading(false)
    }
  }

  // Statistics
  const mappedCount = mappings.filter(m => m.uafbl_player_id !== null).length
  const unmappedCount = mappings.length - mappedCount

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
              <span className="text-gray-900 font-medium">Yahoo Player Mappings</span>
            </div>
          </nav>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Yahoo Player Mappings</h2>
          <p className="text-gray-600 mb-4">
            Map Yahoo Fantasy players to your UAFBL database players for roster sync functionality.
          </p>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{mappings.length}</div>
              <div className="text-sm text-gray-500">Total Players</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{mappedCount}</div>
              <div className="text-sm text-gray-500">Mapped</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{unmappedCount}</div>
              <div className="text-sm text-gray-500">Unmapped</div>
            </div>
          </div>

          {/* Auto-Map Button */}
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={generateAutoMappings}
              disabled={autoMapLoading || unmappedCount === 0}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {autoMapLoading ? 'Analyzing...' : 'Auto-Map by Name'}
            </button>
            
          </div>
        </div>

        <ErrorAlert error={error} />

        {/* Auto-mapping suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Auto-Mapping Suggestions ({suggestions.length})
                </h3>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      // Select all suggestions
                      setApprovedSuggestions(new Set(suggestions.map((_, index) => index)))
                    }}
                    className="text-sm text-blue-600 hover:text-blue-900"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setApprovedSuggestions(new Set())}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowSuggestions(false)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Hide
                  </button>
                </div>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={suggestion.yahoo_mapping_id}
                  className={`px-6 py-3 border-b border-gray-100 flex items-center justify-between ${
                    approvedSuggestions.has(index) ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={approvedSuggestions.has(index)}
                      onChange={() => toggleSuggestion(index)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">{suggestion.yahoo_name}</span>
                        <span className="mx-2">→</span>
                        <span className="font-medium text-blue-600">{suggestion.uafbl_name}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {suggestion.confidence}% confidence match
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {approvedSuggestions.size} of {suggestions.length} suggestions selected
                </span>
                <button
                  onClick={applyApprovedSuggestions}
                  disabled={autoMapLoading || approvedSuggestions.size === 0}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {autoMapLoading ? 'Applying...' : `Apply ${approvedSuggestions.size} Mappings`}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading Yahoo player mappings..." />
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {mappings.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500 mb-4">
                  No Yahoo player mappings found. Import the top players to get started.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Yahoo Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        UAFBL Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mappings.map((mapping) => (
                      <tr key={mapping.id} className={mapping.uafbl_player_id ? 'bg-green-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {mapping.yahoo_image_url && (
                              <img 
                                src={mapping.yahoo_image_url} 
                                alt={mapping.yahoo_name_full}
                                className="h-8 w-8 rounded-full mr-3"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {mapping.yahoo_name_full}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {mapping.yahoo_player_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {mapping.yahoo_positions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{mapping.yahoo_team_abbr}</div>
                          <div className="text-xs text-gray-400">{mapping.yahoo_team_full}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingId === mapping.id ? (
                            <div className="space-y-2 min-w-64">
                              <PlayerSearch
                                placeholder="Search UAFBL player..."
                                onPlayerSelect={handlePlayerSelect}
                                value={playerSearchQuery}
                                onChange={setPlayerSearchQuery}
                                className="w-full"
                              />
                              {selectedPlayer && (
                                <div className="text-xs text-green-600">
                                  Selected: {selectedPlayer.name} (ID: {selectedPlayer.id})
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm">
                              {mapping.uafbl_player_name ? (
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {mapping.uafbl_player_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {mapping.uafbl_player_id}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-400 italic">Not mapped</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {mapping.uafbl_player_id ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Mapped
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Unmapped
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-y-1">
                          {editingId === mapping.id ? (
                            <div className="space-x-2">
                              <button
                                onClick={() => saveMapping(mapping.id)}
                                disabled={!selectedPlayer}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div>
                                <button
                                  onClick={() => startEditing(mapping.id)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  {mapping.uafbl_player_id ? 'Edit' : 'Map'}
                                </button>
                              </div>
                              {mapping.uafbl_player_id && (
                                <>
                                  <div>
                                    <button
                                      onClick={() => unmapPlayer(mapping.id)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Unmap
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
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