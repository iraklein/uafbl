'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import LoadingState from '../../components/LoadingState'
import ErrorAlert from '../../components/ErrorAlert'
import DataTable, { Column } from '../../components/DataTable'
import ManagerHeader from '../../components/ManagerHeader'
import { Roster, Season } from '../../types'


interface GroupedRosters {
  [managerName: string]: Roster[]
}

export default function Rosters() {
  const [rosters, setRosters] = useState<Roster[]>([])
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [rostersLoading, setRostersLoading] = useState(false)
  const [error, setError] = useState('')
  const [rostersError, setRostersError] = useState('')

  // Fetch current active season and rosters on mount
  useEffect(() => {
    async function fetchCurrentSeasonAndRosters() {
      setLoading(true)
      setError('')

      try {
        // Get current active season
        const seasonsResponse = await fetch('/api/seasons')
        if (!seasonsResponse.ok) throw new Error('Failed to fetch seasons')
        
        const seasons = await seasonsResponse.json()
        const activeSeason = seasons.find((season: Season) => season.is_active === true)
        
        if (!activeSeason) {
          setError('No active season found')
          return
        }

        setCurrentSeason(activeSeason)

        // Fetch rosters for active season
        setRostersLoading(true)
        setRostersError('')

        const rostersResponse = await fetch(`/api/rosters?season_id=${activeSeason.id}`)
        if (!rostersResponse.ok) throw new Error('Failed to fetch rosters')
        
        const rostersData = await rostersResponse.json()
        setRosters(rostersData)
      } catch (error) {
        console.error('Error:', error)
        setError('Failed to load data')
      } finally {
        setLoading(false)
        setRostersLoading(false)
      }
    }

    fetchCurrentSeasonAndRosters()
  }, [])

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
      key: 'keeper_cost',
      header: 'Keep $',
      headerClassName: 'text-center w-24 whitespace-nowrap',
      className: 'text-center',
      render: (value) => value ? `$${value}` : '-'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:pb-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
        <Header />

        <div className="mb-6 sm:mb-8">
          
          {/* Controls section */}
          <div className="mb-4">
            <div className="flex flex-row space-x-3 sm:space-x-4">
              {/* Current Season Pill */}
              {currentSeason && (
                <div className="bg-indigo-100 border border-indigo-300 px-3 py-2 rounded-lg flex-shrink-0">
                  <span className="text-sm font-medium text-indigo-900">{currentSeason.name} Season</span>
                </div>
              )}

              {/* Player count info box */}
              {currentSeason && (
                <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg flex-shrink-0">
                  <span className="text-sm font-medium text-blue-900">{rosters.length} total players</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <ErrorAlert error={error} />
        <ErrorAlert error={rostersError} />

        {loading ? (
          <LoadingState message="Loading current season..." />
        ) : rostersLoading ? (
          <LoadingState message="Loading rosters..." />
        ) : currentSeason ? (
          <>
            {sortedManagers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {sortedManagers.map(({ managerName, players }) => (
                  <div key={managerName}>
                    <div className="bg-indigo-600 text-white px-2 py-2 rounded-t-lg sm:px-3">
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
          <LoadingState message="No active season found." />
        )}
      </div>
    </div>
  )
}