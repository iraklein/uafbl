'use client'

import { useState, useEffect, useCallback } from 'react'
import Navigation from "../../components/Navigation"

interface Season {
  id: number
  year: number
  name: string
  is_active: boolean
}


export default function Admin() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Add Season states
  const [seasonName, setSeasonName] = useState('')
  const [seasonYear, setSeasonYear] = useState('')
  const [makeActive, setMakeActive] = useState(false)
  const [addSeasonLoading, setAddSeasonLoading] = useState(false)
  const [addSeasonResult, setAddSeasonResult] = useState<string>('')
  
  // Initialize Assets states
  const [initializeLoading, setInitializeLoading] = useState(false)
  const [initializeResult, setInitializeResult] = useState<string>('')
  

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


  const handleAddSeason = async () => {
    if (!seasonName.trim() || !seasonYear.trim()) {
      setAddSeasonResult('❌ Please enter both season name and year')
      return
    }

    setAddSeasonLoading(true)
    setAddSeasonResult('')

    try {
      const response = await fetch('/api/admin/add-season', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: seasonName.trim(), 
          year: parseInt(seasonYear),
          isActive: makeActive
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setAddSeasonResult(`✅ ${data.message}`)
        setSeasonName('')
        setSeasonYear('')
        setMakeActive(false)
        // Refresh seasons list
        const seasonsResponse = await fetch('/api/seasons')
        const seasonsData = await seasonsResponse.json()
        setSeasons(seasonsData)
      } else {
        setAddSeasonResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error adding season:', error)
      setAddSeasonResult('❌ Failed to add season')
    } finally {
      setAddSeasonLoading(false)
    }
  }

  const handleInitializeSeason = async () => {
    if (!selectedSeason) {
      setInitializeResult('Please select a season first')
      return
    }

    setInitializeLoading(true)
    setInitializeResult('')

    try {
      const response = await fetch('/api/admin/initialize-season', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seasonId: parseInt(selectedSeason) }),
      })

      const data = await response.json()

      if (response.ok) {
        setInitializeResult(`✅ ${data.message}`)
      } else {
        setInitializeResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error initializing season:', error)
      setInitializeResult('❌ Failed to initialize season assets')
    } finally {
      setInitializeLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">UAFBL</h1>
            
          {/* Navigation Tabs */}
          <Navigation />
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Admin Panel</h2>
          <p className="text-gray-600 mb-6">Administrative tools for managing seasons and league operations</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">Loading admin tools...</div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Step 1: Add New Season */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Add New Season</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Create a new season in the database. Mark as active to make it the current season.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="season-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Season Name:
                  </label>
                  <input
                    id="season-name"
                    type="text"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="e.g., 2025-26 Season"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
                <div>
                  <label htmlFor="season-year" className="block text-sm font-medium text-gray-700 mb-2">
                    Year:
                  </label>
                  <input
                    id="season-year"
                    type="number"
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(e.target.value)}
                    placeholder="2025"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={makeActive}
                      onChange={(e) => setMakeActive(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Make Active</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleAddSeason}
                  disabled={addSeasonLoading}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addSeasonLoading ? 'Adding...' : 'Add Season'}
                </button>
                
                {addSeasonResult && (
                  <div className={`text-sm ${
                    addSeasonResult.includes('✅') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {addSeasonResult}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Initialize Season Assets */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Initialize Season Assets</h3>
              </div>
              <p className="text-gray-600 mb-4">
                After creating a new season, initialize manager assets with $400 cash and 3 slots for all active managers.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Season:
                  </label>
                  <select
                    id="season-select"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  >
                    <option value="">Choose a season...</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name} ({season.year}) {season.is_active ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleInitializeSeason}
                    disabled={initializeLoading || !selectedSeason}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {initializeLoading ? 'Initializing...' : 'Initialize Manager Assets'}
                  </button>
                  
                  {initializeResult && (
                    <div className={`text-sm ${
                      initializeResult.includes('✅') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {initializeResult}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="text-sm text-blue-700">
                    <strong>Note:</strong> This will create new asset records for all active managers with:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>$400 available cash</li>
                      <li>3 available slots</li>
                    </ul>
                    This operation will fail if assets already exist for the selected season.
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