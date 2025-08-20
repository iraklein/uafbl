'use client'

import { useState, useEffect } from 'react'
import Navigation from "../../components/Navigation"

interface TopperRecord {
  id: number
  manager_id: number
  player_id: number
  season_id: number
  is_winner: boolean
  is_unused: boolean
  managers: {
    manager_name: string
  }
  players: {
    name: string
  }
  seasons: {
    year: number
    name: string
  }
}

interface Season {
  id: number
  year: number
  name: string
}

export default function ToppersPage() {
  const [toppersData, setToppersData] = useState<TopperRecord[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    manager: '',
    player: '',
    status: ''
  })

  // Fetch seasons for dropdown
  useEffect(() => {
    async function fetchSeasons() {
      try {
        const response = await fetch('/api/seasons')
        if (!response.ok) throw new Error('Failed to fetch seasons')
        
        const data = await response.json()
        // Filter seasons to only include 2016 and later (when toppers started)
        const toppersSeasons = data.filter((season: Season) => season.year >= 2016)
        setSeasons(toppersSeasons)
      } catch (error) {
        console.error('Error fetching seasons:', error)
        setError('Failed to load seasons')
      }
    }

    fetchSeasons()
  }, [])

  // Fetch toppers for selected season
  useEffect(() => {
    if (!selectedSeason) return

    async function fetchToppersData() {
      setLoading(true)
      try {
        const response = await fetch('/api/toppers')
        if (!response.ok) throw new Error('Failed to fetch toppers data')
        
        const data = await response.json()
        
        // Filter by selected season (or show all if "all" is selected)
        const filteredData = selectedSeason === 'all' 
          ? data 
          : data.filter((topper: TopperRecord) => 
              topper.season_id.toString() === selectedSeason
            )
        setToppersData(filteredData)
      } catch (error) {
        console.error('Error fetching toppers data:', error)
        setError('Failed to load toppers data')
      } finally {
        setLoading(false)
      }
    }

    fetchToppersData()
  }, [selectedSeason])

  // Find multi-topped players for current season
  const getPlayerStatus = (record: TopperRecord) => {
    if (record.is_unused) return 'Unused'
    
    // Check if this player was multi-topped
    const samePlayerRecords = toppersData.filter(r => r.player_id === record.player_id)
    if (samePlayerRecords.length > 1) {
      return record.is_winner ? 'Used' : 'Lost'
    }
    
    return 'Used'
  }

  // Filter data based on search filters
  const filteredToppersData = toppersData.filter(record => {
    const status = getPlayerStatus(record)
    
    const managerMatch = filters.manager === '' || 
      record.managers?.manager_name === filters.manager
    
    const playerMatch = filters.player === '' || 
      record.players.name.toLowerCase().includes(filters.player.toLowerCase())
    
    const statusMatch = filters.status === '' || 
      status === filters.status
    
    return managerMatch && playerMatch && statusMatch
  })

  // Calculate statistics from filtered data
  const totalToppers = filteredToppersData.length
  const usedCount = filteredToppersData.filter(r => getPlayerStatus(r) === 'Used').length
  const unusedCount = filteredToppersData.filter(r => getPlayerStatus(r) === 'Unused').length
  const lostCount = filteredToppersData.filter(r => getPlayerStatus(r) === 'Lost').length

  const selectedSeasonName = selectedSeason === 'all' 
    ? 'All Seasons' 
    : seasons.find(s => s.id.toString() === selectedSeason)?.name || ''

  // Handle filter changes
  const handleFilterChange = (column: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      manager: '',
      player: '',
      status: ''
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">Loading toppers data...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">UAFBL</h1>
          
          {/* Navigation Tabs */}
          <Navigation />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Toppers</h2>
          
          {selectedSeasonName && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h3 className="text-xl font-semibold text-gray-800">{selectedSeasonName}</h3>
              <p className="text-gray-600">
                Showing {totalToppers} toppers: Used: {usedCount} | Unused: {unusedCount} | Lost: {lostCount}
              </p>
            </div>
          )}
        </div>

        {!loading && (
          <div className="mb-6">
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">Filters</h4>
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="season-select" className="block text-sm font-medium text-gray-900 mb-1">
                    Season
                  </label>
                  <select
                    id="season-select"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                  >
                    <option value="" className="text-gray-500">Choose a season...</option>
                    <option value="all" className="text-gray-900">All Seasons</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id} className="text-gray-900">
                        {season.name} ({season.year})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="manager-filter" className="block text-sm font-medium text-gray-900 mb-1">
                    Manager
                  </label>
                  <select
                    id="manager-filter"
                    value={filters.manager}
                    onChange={(e) => handleFilterChange('manager', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                  >
                    <option value="">All Managers</option>
                    {[...new Set(toppersData.map(r => r.managers?.manager_name).filter(Boolean))]
                      .sort()
                      .map((managerName) => (
                        <option key={managerName} value={managerName}>
                          {managerName}
                        </option>
                      ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="player-filter" className="block text-sm font-medium text-gray-900 mb-1">
                    Player
                  </label>
                  <input
                    id="player-filter"
                    type="text"
                    placeholder="Search players..."
                    value={filters.player}
                    onChange={(e) => handleFilterChange('player', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <label htmlFor="status-filter" className="block text-sm font-medium text-gray-900 mb-1">
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                  >
                    <option value="">All Statuses</option>
                    <option value="Used">Used</option>
                    <option value="Unused">Unused</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Season
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredToppersData
                      .sort((a, b) => (a.managers?.manager_name || '').localeCompare(b.managers?.manager_name || ''))
                      .map((record) => {
                        const status = getPlayerStatus(record)
                        
                        return (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                              {record.seasons.year}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {record.managers?.manager_name || 'Unknown'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.players.name}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                status === 'Used' 
                                  ? 'bg-green-100 text-green-800'
                                  : status === 'Unused'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && filteredToppersData.length === 0 && toppersData.length > 0 && (
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">No toppers match the current filters.</div>
            <button
              onClick={clearFilters}
              className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && toppersData.length === 0 && selectedSeason && (
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">No toppers found for this season.</div>
          </div>
        )}
      </div>
    </div>
  )
}