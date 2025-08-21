'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import SeasonSelector from '../../components/SeasonSelector'
import LoadingState from '../../components/LoadingState'
import ErrorAlert from '../../components/ErrorAlert'
import DataTable, { Column } from '../../components/DataTable'
import ManagerHeader from '../../components/ManagerHeader'
import { useSeasons } from '../../hooks/useSeasons'
import { Roster } from '../../types'


interface GroupedRosters {
  [managerName: string]: Roster[]
}

export default function Rosters() {
  const { seasons, selectedSeason, setSelectedSeason, loading, error } = useSeasons()
  const [rosters, setRosters] = useState<Roster[]>([])
  const [rostersLoading, setRostersLoading] = useState(false)
  const [rostersError, setRostersError] = useState('')

  // Fetch rosters when season changes
  useEffect(() => {
    if (!selectedSeason) return

    async function fetchRosters() {
      setRostersLoading(true)
      setRostersError('')

      try {
        const response = await fetch(`/api/rosters?season_id=${selectedSeason}`)
        if (!response.ok) throw new Error('Failed to fetch rosters')
        
        const data = await response.json()
        setRosters(data)
      } catch (error) {
        console.error('Error fetching rosters:', error)
        setRostersError('Failed to load rosters')
      } finally {
        setRostersLoading(false)
      }
    }

    fetchRosters()
  }, [selectedSeason])

  // Group rosters by manager
  const groupedRosters: GroupedRosters = rosters.reduce((acc, roster) => {
    const managerName = roster.managers.manager_name
    if (!acc[managerName]) {
      acc[managerName] = []
    }
    acc[managerName].push(roster)
    return acc
  }, {} as GroupedRosters)

  // Sort managers and their players
  const sortedManagers = Object.entries(groupedRosters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([managerName, managerRosters]) => ({
      managerName,
      players: managerRosters.sort((a, b) => {
        // Sort by draft price descending (highest first), then by name if no price
        const priceA = a.draft_price || 0;
        const priceB = b.draft_price || 0;
        if (priceA !== priceB) {
          return priceB - priceA; // Descending order
        }
        // If same price (or both null), sort by name
        return a.players.name.localeCompare(b.players.name);
      })
    }))

  const selectedSeasonName = seasons.find(s => s.id.toString() === selectedSeason)?.name || ''

  // Define columns for the roster DataTable
  const rosterColumns: Column<Roster>[] = [
    {
      key: 'players.name',
      header: 'Player',
      className: 'font-medium',
      headerClassName: 'w-2/5'
    },
    {
      key: 'draft_price',
      header: 'Price',
      headerClassName: 'text-center w-1/8',
      className: 'text-center',
      render: (value) => value ? `$${value}` : '-'
    },
    {
      key: 'consecutive_keeps',
      header: 'Kept',
      headerClassName: 'text-center w-1/8',
      className: 'text-center',
      render: (value) => value !== null ? value + 1 : '-'
    },
    {
      key: 'trade_count',
      header: 'Trades',
      headerClassName: 'text-center w-1/8',
      className: 'text-center',
      render: (value) => value ? value : '-'
    },
    {
      key: 'calculated_keeper_cost',
      header: 'Keep $',
      headerClassName: 'text-center w-24 whitespace-nowrap',
      className: 'text-center',
      render: (value) => value ? `$${value}` : '-'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />

        <div className="mb-8">
          
          {/* Header with inline season selector */}
          <div className="flex items-center space-x-6 mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Team Rosters</h2>
            
            {/* Season Selector */}
            <SeasonSelector
              seasons={seasons}
              selectedSeason={selectedSeason}
              onSeasonChange={setSelectedSeason}
              loading={loading}
            />

            {/* Player count info box */}
            {selectedSeason && (
              <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-blue-900">{rosters.length} total players</span>
              </div>
            )}
          </div>
        </div>

        <ErrorAlert error={error} />
        <ErrorAlert error={rostersError} />

        {loading ? (
          <LoadingState message="Loading seasons..." />
        ) : rostersLoading ? (
          <LoadingState message="Loading rosters..." />
        ) : selectedSeason ? (
          <>
            {sortedManagers.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedManagers.map(({ managerName, players }) => (
                  <div key={managerName}>
                    <div className="bg-indigo-600 text-white px-3 py-2 rounded-t-lg">
                      <div className="flex justify-between items-center">
                        <ManagerHeader
                          managerName={managerName}
                          teamName={players[0]?.managers?.team_name}
                          showLogo={true}
                          logoSize="md"
                          textSize="sm"
                        />
                        <div className="text-xs">
                          <span>{players.length}</span>
                        </div>
                      </div>
                    </div>
                    
                    <DataTable
                      columns={rosterColumns}
                      data={players}
                      className="rounded-t-none shadow"
                      emptyMessage={`No players found for ${managerName}.`}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <LoadingState message="No rosters found for this season." />
            )}
          </>
        ) : (
          <LoadingState message="Please select a season to view rosters." />
        )}
      </div>
    </div>
  )
}