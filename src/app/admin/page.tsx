'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from "../../components/Header"
import SeasonSelector from "../../components/SeasonSelector"
import ErrorAlert from "../../components/ErrorAlert"
import LoadingState from "../../components/LoadingState"

interface Season {
  id: number
  year: number
  name: string
  is_active: boolean
  is_active_assets: boolean
}


export default function Admin() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Start New Season states
  const [startSeasonLoading, setStartSeasonLoading] = useState(false)
  const [startSeasonResult, setStartSeasonResult] = useState<string>('')
  

  useEffect(() => {
    async function fetchSeasons() {
      try {
        const response = await fetch('/api/seasons')
        if (!response.ok) throw new Error('Failed to fetch seasons')
        
        const data = await response.json()
        setSeasons(data)
      } catch (error) {
        console.error('Error fetching seasons:', error)
        setError('Failed to load seasons')
      } finally {
        setLoading(false)
      }
    }

    fetchSeasons()
  }, [])


  const handleStartNewSeason = async () => {
    setStartSeasonLoading(true)
    setStartSeasonResult('')

    try {
      const response = await fetch('/api/admin/start-new-season', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // No longer need name/year input
      })

      const data = await response.json()

      if (response.ok) {
        setStartSeasonResult(`✅ ${data.message}`)
        // Refresh seasons list
        const seasonsResponse = await fetch('/api/seasons')
        const seasonsData = await seasonsResponse.json()
        setSeasons(seasonsData)
      } else {
        setStartSeasonResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error starting new season:', error)
      setStartSeasonResult('❌ Failed to start new season')
    } finally {
      setStartSeasonLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />

        <div className="mb-8">
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Admin Panel</h2>
          <p className="text-gray-600 mb-6">Administrative tools for managing seasons and league operations</p>
        </div>

        <ErrorAlert error={error} />

        {loading ? (
          <LoadingState message="Loading admin tools..." />
        ) : (
          <div className="space-y-8">
            {/* Start New Season */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-green-200">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Start New Season</h3>
              </div>
              <p className="text-gray-600 mb-4">
                <strong>Automatically advance seasons:</strong> Moves is_active and is_active_assets flags to the next sequential season IDs. All trades are cleared for the new assets season, resetting everyone to $400/3 slots.
              </p>

              <div className="flex items-center space-x-4 mb-4">
                <button
                  onClick={handleStartNewSeason}
                  disabled={startSeasonLoading}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startSeasonLoading ? 'Starting...' : 'Start New Season'}
                </button>
                
                {startSeasonResult && (
                  <div className={`text-sm ${
                    startSeasonResult.includes('✅') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {startSeasonResult}
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="text-sm text-green-700">
                  <strong>This will automatically:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Move is_active flag to the next season ID (current playing season)</li>
                    <li>Move is_active_assets flag to the next season ID (current draft/assets season)</li>
                    <li>Reset all manager assets to $400 cash and 3 slots (no trades in new assets season)</li>
                    <li>Clean slate for the new draft year</li>
                  </ul>
                  <div className="mt-2 font-medium text-green-800">
                    ⚠️ Use this button to advance to the next league year.
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}