'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Header from "../../components/Header"
import SeasonSelector from "../../components/SeasonSelector"
import LoadingState from "../../components/LoadingState"
import ErrorAlert from "../../components/ErrorAlert"
import Select from "../../components/Select"
import PlayerSearch from "../../components/PlayerSearch"
import { useSeasons } from "../../hooks/useSeasons"
import { Season, TopperRecord } from "../../types"


export default function ToppersPage() {
  // Memoize the filter function to prevent useSeasons re-renders
  const seasonsFilter = useCallback((seasons: Season[]) => 
    seasons.filter(season => season.year >= 2016), []
  )

  const { seasons, loading, error } = useSeasons({ 
    autoSelectDefault: false,
    filterFunction: seasonsFilter,
    excludeFutureSeasons: true
  })
  const [toppersData, setToppersData] = useState<TopperRecord[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('all')
  const [toppersLoading, setToppersLoading] = useState(false)
  const [toppersError, setToppersError] = useState('')
  const [filters, setFilters] = useState({
    manager: '',
    player: '',
    status: ''
  })


  // Fetch toppers for selected season
  useEffect(() => {
    async function fetchToppersData() {
      setToppersLoading(true)
      setToppersError('')
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
        setToppersError('Failed to load toppers data')
      } finally {
        setToppersLoading(false)
      }
    }

    fetchToppersData()
  }, [selectedSeason])

  // Memoize the getPlayerStatus function to avoid re-calculations
  const getPlayerStatus = useCallback((record: TopperRecord) => {
    if (record.is_unused) return 'Unused'
    
    // Check if this player was multi-topped
    const samePlayerRecords = toppersData.filter(r => r.player_id === record.player_id)
    if (samePlayerRecords.length > 1) {
      return record.is_winner ? 'Used' : 'Lost'
    }
    
    return 'Used'
  }, [toppersData])

  // Memoize filtered data to prevent re-filtering on every render
  const filteredToppersData = useMemo(() => {
    return toppersData.filter(record => {
      const status = getPlayerStatus(record)
      
      const managerMatch = filters.manager === '' || 
        record.managers?.manager_name === filters.manager
      
      const playerMatch = filters.player === '' || 
        record.players.name.toLowerCase().includes(filters.player.toLowerCase())
      
      const statusMatch = filters.status === '' || 
        status === filters.status
      
      return managerMatch && playerMatch && statusMatch
    })
  }, [toppersData, filters, getPlayerStatus])

  // Memoize statistics calculations
  const statistics = useMemo(() => {
    const totalToppers = filteredToppersData.length
    const usedCount = filteredToppersData.filter(r => getPlayerStatus(r) === 'Used').length
    const unusedCount = filteredToppersData.filter(r => getPlayerStatus(r) === 'Unused').length
    const lostCount = filteredToppersData.filter(r => getPlayerStatus(r) === 'Lost').length
    
    return { totalToppers, usedCount, unusedCount, lostCount }
  }, [filteredToppersData, getPlayerStatus])


  // Memoize manager options
  const managerOptions = useMemo(() => {
    return [...new Set(toppersData.map(r => r.managers?.manager_name).filter(Boolean))]
      .sort()
  }, [toppersData])

  // Handle filter changes
  const handleFilterChange = useCallback((column: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      manager: '',
      player: '',
      status: ''
    })
  }, [])


  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />

        <ErrorAlert error={error} />
        <ErrorAlert error={toppersError} />

        {loading ? (
          <LoadingState message="Loading seasons..." />
        ) : (
          <>
            <div className="mb-8">
              <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg w-fit">
                <span className="text-sm font-medium text-blue-900">
                  {statistics.totalToppers} toppers: Used: {statistics.usedCount} | Unused: {statistics.unusedCount} | Lost: {statistics.lostCount}
                </span>
              </div>
            </div>

        {!toppersLoading && (
          <div className="mb-6">
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="season-select" className="block text-sm font-medium text-gray-900 mb-1">
                    Season
                  </label>
                  <SeasonSelector
                    seasons={seasons}
                    selectedSeason={selectedSeason}
                    onSeasonChange={setSelectedSeason}
                    placeholder="Choose a season..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                    additionalOptions={[
                      { value: 'all', label: 'All Seasons' }
                    ]}
                  />
                </div>
                <div>
                  <Select
                    label="Manager"
                    value={filters.manager}
                    onChange={(e) => handleFilterChange('manager', e.target.value)}
                    placeholder="All Managers"
                    size="md"
                    className="text-sm text-gray-900"
                    options={managerOptions.map(managerName => ({
                      value: managerName,
                      label: managerName
                    }))}
                  />
                </div>
                
                <div>
                  <div className="mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Player
                    </label>
                  </div>
                  <PlayerSearch
                    placeholder="Search players..."
                    value={filters.player}
                    onChange={(value) => handleFilterChange('player', value)}
                    className="text-sm"
                  />
                </div>
                
                <div>
                  <Select
                    label="Status"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    placeholder="All Statuses"
                    size="md"
                    className="text-sm text-gray-900"
                    options={[
                      { value: 'Used', label: 'Used' },
                      { value: 'Unused', label: 'Unused' },
                      { value: 'Lost', label: 'Lost' }
                    ]}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-indigo-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Season
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredToppersData
                      .sort((a, b) => {
                        // First sort by season (descending - newest first)
                        const seasonCompare = b.seasons.year - a.seasons.year
                        if (seasonCompare !== 0) return seasonCompare
                        
                        // Then sort by manager name (ascending)
                        return (a.managers?.manager_name || '').localeCompare(b.managers?.manager_name || '')
                      })
                      .map((record) => {
                        const status = getPlayerStatus(record)
                        
                        return (
                          <tr key={record.id} className="hover:bg-indigo-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.seasons.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.managers?.manager_name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {record.players.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
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

        {!toppersLoading && filteredToppersData.length === 0 && toppersData.length > 0 && (
          <div className="text-center pb-8">
            <div className="text-lg text-gray-600">No toppers match the current filters.</div>
            <button
              onClick={clearFilters}
              className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

            {!toppersLoading && toppersData.length === 0 && selectedSeason && (
              <LoadingState message="No toppers found for this season." />
            )}
          </>
        )}
      </div>
    </div>
  )
}