'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import ErrorAlert from '../../components/ErrorAlert'
import Modal from '../../components/Modal'
import Select from '../../components/Select'
import FormInput from '../../components/FormInput'
import PlayerSearch from '../../components/PlayerSearch'

interface Player {
  id: number
  name: string
}

interface Manager {
  id: number
  manager_name: string
}

interface DraftPick {
  id?: number
  player_id: number
  player_name: string
  manager_id: number
  manager_name: string
  draft_price: number
  is_keeper: boolean
  is_topper: boolean
  topper_managers?: string[]
  season_id: number
  created_at?: string
}

const CURRENT_SEASON_ID = 1 // 2025-26 Season

export default function DraftPage() {
  // Search states
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // Form states
  const [selectedManager, setSelectedManager] = useState('')
  const [isKeeper, setIsKeeper] = useState(false)
  const [draftPrice, setDraftPrice] = useState('')
  const [calculatedKeeperPrice, setCalculatedKeeperPrice] = useState<number | null>(null)
  const [isTopper, setIsTopper] = useState(false)
  const [selectedTopperManagers, setSelectedTopperManagers] = useState<string[]>([])

  // Data states
  const [managers, setManagers] = useState<Manager[]>([])
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit states
  const [editingPickId, setEditingPickId] = useState<number | null>(null)
  const [editingPick, setEditingPick] = useState<Partial<DraftPick> | null>(null)
  
  // Player search states for editing
  const [editPlayerSearchQuery, setEditPlayerSearchQuery] = useState('')

  // Create player modal states
  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [creatingPlayer, setCreatingPlayer] = useState(false)

  // Fetch managers
  useEffect(() => {
    async function fetchManagers() {
      try {
        const response = await fetch('/api/managers')
        if (!response.ok) throw new Error('Failed to fetch managers')
        const data = await response.json()
        setManagers(data)
      } catch (error) {
        console.error('Error fetching managers:', error)
        setError('Failed to load managers')
      }
    }
    fetchManagers()
  }, [])

  // Fetch existing draft picks for current season
  useEffect(() => {
    async function fetchDraftPicks() {
      try {
        const response = await fetch(`/api/draft-picks?season_id=${CURRENT_SEASON_ID}`)
        if (response.ok) {
          const data = await response.json()
          setDraftPicks(data)
        }
      } catch (error) {
        console.error('Error fetching draft picks:', error)
      }
    }
    fetchDraftPicks()
  }, [])



  // Handle player selection
  const handlePlayerSelect = async (player: Player) => {
    setSelectedPlayer(player)
    setPlayerSearchQuery(player.name)
    
    // If keeper is checked, fetch the calculated keeper price
    if (isKeeper) {
      await fetchKeeperPrice(player.id)
    }
  }

  // Handle exact match or enter press
  const handlePlayerExactMatch = async (player: Player) => {
    if (player.id === -1) {
      // This is a new player, trigger create modal
      setNewPlayerName(player.name)
      setShowCreatePlayerModal(true)
    } else {
      // Existing player
      await handlePlayerSelect(player)
    }
  }


  // Create new player
  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim()) return
    
    setCreatingPlayer(true)
    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create player')
      }
      
      const newPlayer = await response.json()
      
      // Select the newly created player based on context
      if (editingPickId) {
        // We're editing a draft pick
        handleEditPlayerSelect(newPlayer)
      } else {
        // We're in the main form
        await handlePlayerSelect(newPlayer)
      }
      
      // Close modal and reset
      setShowCreatePlayerModal(false)
      setNewPlayerName('')
      
    } catch (error) {
      console.error('Error creating player:', error)
      setError(error instanceof Error ? error.message : 'Failed to create player')
    } finally {
      setCreatingPlayer(false)
    }
  }

  // Cancel player creation
  const handleCancelCreatePlayer = () => {
    setShowCreatePlayerModal(false)
    setNewPlayerName('')
  }

  // Fetch keeper price for selected player
  const fetchKeeperPrice = async (playerId: number) => {
    try {
      const response = await fetch(`/api/keeper-price?player_id=${playerId}&season_id=${CURRENT_SEASON_ID}`)
      if (response.ok) {
        const data = await response.json()
        setCalculatedKeeperPrice(data.keeper_price)
        setDraftPrice(data.keeper_price?.toString() || '')
      }
    } catch (error) {
      console.error('Error fetching keeper price:', error)
    }
  }

  // Handle keeper checkbox change
  const handleKeeperChange = async (checked: boolean) => {
    setIsKeeper(checked)
    if (checked && selectedPlayer) {
      await fetchKeeperPrice(selectedPlayer.id)
    } else {
      setCalculatedKeeperPrice(null)
      setDraftPrice('')
    }
  }

  // Handle topper manager selection
  const handleTopperManagerChange = (managerId: string, checked: boolean) => {
    if (checked) {
      setSelectedTopperManagers(prev => [...prev, managerId])
    } else {
      setSelectedTopperManagers(prev => prev.filter(id => id !== managerId))
    }
  }

  // Save draft pick
  const handleSave = async () => {
    if (!selectedPlayer || !selectedManager || !draftPrice) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError('')

    try {
      const draftPick = {
        player_id: selectedPlayer.id,
        manager_id: parseInt(selectedManager),
        draft_price: parseInt(draftPrice),
        is_keeper: isKeeper,
        is_topper: isTopper,
        topper_manager_ids: isTopper ? selectedTopperManagers.map(id => parseInt(id)) : [],
        season_id: CURRENT_SEASON_ID
      }

      const response = await fetch('/api/draft-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftPick)
      })

      if (!response.ok) throw new Error('Failed to save draft pick')

      // Reset form
      setSelectedPlayer(null)
      setPlayerSearchQuery('')
      setSelectedManager('')
      setIsKeeper(false)
      setDraftPrice('')
      setCalculatedKeeperPrice(null)
      setIsTopper(false)
      setSelectedTopperManagers([])

      // Refresh draft picks
      const updatedResponse = await fetch(`/api/draft-picks?season_id=${CURRENT_SEASON_ID}`)
      if (updatedResponse.ok) {
        const data = await updatedResponse.json()
        setDraftPicks(data)
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save draft pick')
    } finally {
      setSaving(false)
    }
  }

  // Delete draft pick
  const handleDelete = async (pickId: number) => {
    if (!confirm('Are you sure you want to delete this draft pick?')) {
      return
    }

    try {
      const response = await fetch(`/api/draft-picks/${pickId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete draft pick')

      // Refresh draft picks
      const updatedResponse = await fetch(`/api/draft-picks?season_id=${CURRENT_SEASON_ID}`)
      if (updatedResponse.ok) {
        const data = await updatedResponse.json()
        setDraftPicks(data)
      }

    } catch (error) {
      console.error('Error deleting draft pick:', error)
      setError('Failed to delete draft pick')
    }
  }

  // Start editing a draft pick
  const handleEdit = (pick: DraftPick) => {
    setEditingPickId(pick.id!)
    setEditingPick({
      ...pick,
      topper_managers: pick.topper_managers || []
    })
    setEditPlayerSearchQuery(pick.player_name)
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPickId(null)
    setEditingPick(null)
    setEditPlayerSearchQuery('')
  }

  // Handle player selection for editing
  const handleEditPlayerSelect = (player: Player) => {
    setEditPlayerSearchQuery(player.name)
    setEditingPick(prev => ({
      ...prev!,
      player_id: player.id,
      player_name: player.name
    }))
  }

  // Handle exact match or enter press for editing
  const handleEditPlayerExactMatch = async (player: Player) => {
    if (player.id === -1) {
      // This is a new player, trigger create modal
      setNewPlayerName(player.name)
      setShowCreatePlayerModal(true)
    } else {
      // Existing player
      handleEditPlayerSelect(player)
    }
  }

  // Save edited draft pick
  const handleSaveEdit = async () => {
    if (!editingPick || !editingPickId) return

    try {
      const response = await fetch(`/api/draft-picks/${editingPickId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: editingPick.player_id,
          manager_id: editingPick.manager_id,
          draft_price: editingPick.draft_price,
          is_keeper: editingPick.is_keeper,
          is_topper: editingPick.is_topper,
          topper_manager_ids: editingPick.is_topper && editingPick.topper_managers 
            ? editingPick.topper_managers.map(name => {
                const manager = managers.find(m => m.manager_name === name)
                return manager ? manager.id : null
              }).filter(Boolean)
            : []
        })
      })

      if (!response.ok) throw new Error('Failed to update draft pick')

      // Refresh draft picks
      const updatedResponse = await fetch(`/api/draft-picks?season_id=${CURRENT_SEASON_ID}`)
      if (updatedResponse.ok) {
        const data = await updatedResponse.json()
        setDraftPicks(data)
      }

      // Reset editing state
      setEditingPickId(null)
      setEditingPick(null)

    } catch (error) {
      console.error('Error updating draft pick:', error)
      setError('Failed to update draft pick')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />

        <div className="mb-8">
          <div className="flex items-center space-x-6 mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Live Draft Entry</h2>
            <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium text-blue-900">2025-26 Season Draft</span>
            </div>
          </div>
        </div>

        {/* Draft Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Draft Pick</h3>
          
          <ErrorAlert error={error} className="mb-4" />

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Player Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Player *
              </label>
              <PlayerSearch
                value={playerSearchQuery}
                onChange={setPlayerSearchQuery}
                onPlayerSelect={handlePlayerSelect}
                onExactMatch={handlePlayerExactMatch}
                placeholder="Search for player..."
                allowCreateNew={true}
              />
            </div>

            {/* Manager Selection */}
            <div className="md:col-span-2">
              <Select
                label="Manager"
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
                placeholder="Select manager..."
                required
                options={managers.map(manager => ({
                  value: manager.id.toString(),
                  label: manager.manager_name
                }))}
              />
            </div>

            {/* Topper Checkbox */}
            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  id="is-topper"
                  type="checkbox"
                  checked={isTopper}
                  onChange={(e) => setIsTopper(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is-topper" className="ml-2 block text-sm text-gray-900">
                  This player was topped
                </label>
              </div>
            </div>

            {/* Keeper Checkbox */}
            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  id="is-keeper"
                  type="checkbox"
                  checked={isKeeper}
                  onChange={(e) => handleKeeperChange(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is-keeper" className="ml-2 block text-sm text-gray-900">
                  This is a keeper
                  {calculatedKeeperPrice !== null && (
                    <span className="ml-2 text-green-600 font-medium">
                      (Keeper price: ${calculatedKeeperPrice})
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* Draft Price */}
            <div>
              <FormInput
                label={`Draft Price ${isKeeper ? '(Auto-filled for keepers)' : ''}`}
                type="number"
                value={draftPrice}
                onChange={(e) => setDraftPrice(e.target.value)}
                disabled={isKeeper}
                placeholder="Enter draft price..."
                required
              />
            </div>

            {/* Topper Managers */}
            {isTopper && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select managers who had this player as their topper:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {managers.map((manager) => (
                    <div key={manager.id} className="flex items-center">
                      <input
                        id={`topper-manager-${manager.id}`}
                        type="checkbox"
                        checked={selectedTopperManagers.includes(manager.id.toString())}
                        onChange={(e) => handleTopperManagerChange(manager.id.toString(), e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`topper-manager-${manager.id}`} className="ml-2 block text-sm text-gray-900">
                        {manager.manager_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={saving || !selectedPlayer || !selectedManager || !draftPrice}
              className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Draft Pick'}
            </button>
          </div>
        </div>

        {/* Draft Picks Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Draft Picks ({draftPicks.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pick #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Topper
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {draftPicks.map((pick, index) => {
                  const isEditing = editingPickId === pick.id
                  return (
                    <tr key={pick.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {draftPicks.length - index}
                      </td>
                      {/* Player Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {isEditing ? (
                          <PlayerSearch
                            value={editPlayerSearchQuery}
                            onChange={setEditPlayerSearchQuery}
                            onPlayerSelect={handleEditPlayerSelect}
                            onExactMatch={handleEditPlayerExactMatch}
                            placeholder="Search player..."
                            className="text-sm"
                            allowCreateNew={true}
                          />
                        ) : (
                          <>
                            {pick.player_name}
                            {pick.is_keeper && <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs font-bold">K</span>}
                            {pick.is_topper && <span className="ml-1">🎩</span>}
                          </>
                        )}
                      </td>
                      
                      {/* Manager Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isEditing ? (
                          <select
                            value={editingPick?.manager_id || ''}
                            onChange={(e) => setEditingPick(prev => ({
                              ...prev!,
                              manager_id: parseInt(e.target.value),
                              manager_name: managers.find(m => m.id === parseInt(e.target.value))?.manager_name || ''
                            }))}
                            className="block w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            {managers.map(manager => (
                              <option key={manager.id} value={manager.id}>
                                {manager.manager_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          pick.manager_name
                        )}
                      </td>
                      
                      {/* Price Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingPick?.draft_price || ''}
                            onChange={(e) => setEditingPick(prev => ({
                              ...prev!,
                              draft_price: parseInt(e.target.value)
                            }))}
                            className="block w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          `$${pick.draft_price}`
                        )}
                      </td>
                      
                      {/* Type Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editingPick?.is_keeper || false}
                            onChange={(e) => setEditingPick(prev => ({
                              ...prev!,
                              is_keeper: e.target.checked
                            }))}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                          />
                        ) : (
                          pick.is_keeper ? 'Keeper' : 'Draft'
                        )}
                      </td>
                      
                      {/* Topper Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="checkbox"
                              checked={editingPick?.is_topper || false}
                              onChange={(e) => setEditingPick(prev => ({
                                ...prev!,
                                is_topper: e.target.checked,
                                topper_managers: e.target.checked ? prev?.topper_managers || [] : []
                              }))}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                            {editingPick?.is_topper && (
                              <div className="space-y-1">
                                {managers.map(manager => (
                                  <label key={manager.id} className="flex items-center text-xs">
                                    <input
                                      type="checkbox"
                                      checked={editingPick?.topper_managers?.includes(manager.manager_name) || false}
                                      onChange={(e) => {
                                        const currentManagers = editingPick?.topper_managers || []
                                        if (e.target.checked) {
                                          setEditingPick(prev => ({
                                            ...prev!,
                                            topper_managers: [...currentManagers, manager.manager_name]
                                          }))
                                        } else {
                                          setEditingPick(prev => ({
                                            ...prev!,
                                            topper_managers: currentManagers.filter(name => name !== manager.manager_name)
                                          }))
                                        }
                                      }}
                                      className="h-3 w-3 text-indigo-600 border-gray-300 rounded mr-1"
                                    />
                                    {manager.manager_name}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          pick.is_topper ? (pick.topper_managers?.join(', ') || 'Yes') : 'No'
                        )}
                      </td>
                      
                      {/* Actions Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <div className="flex space-x-2">
                            <button 
                              onClick={handleSaveEdit}
                              className="text-green-600 hover:text-green-900" 
                              title="Save"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button 
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-900" 
                              title="Cancel"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleEdit(pick)}
                              className="text-indigo-600 hover:text-indigo-900" 
                              title="Edit"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDelete(pick.id!)}
                              className="text-red-600 hover:text-red-900" 
                              title="Delete"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {draftPicks.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">No draft picks yet. Start drafting!</div>
            </div>
          )}
        </div>
      </div>

      {/* Create Player Modal */}
      <Modal
        isOpen={showCreatePlayerModal}
        onClose={handleCancelCreatePlayer}
        title="Create New Player"
        size="sm"
      >
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Player &quot;{newPlayerName}&quot; was not found in the database. Would you like to create this player?
          </p>
          
          <FormInput
            label="Player Name"
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Enter player name"
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleCreatePlayer}
            disabled={creatingPlayer || !newPlayerName.trim()}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creatingPlayer ? 'Creating...' : 'Create Player'}
          </button>
          <button
            onClick={handleCancelCreatePlayer}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  )
}