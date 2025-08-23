'use client'

import { useState } from 'react'

export default function LeagueExplore() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const exploreLeague = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/yahoo/league-details')
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch league details')
      }
      
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Urban Achievers League Explorer</h1>
      
      <p className="mb-4">
        Explore detailed information about your Urban Achievers fantasy league, 
        including teams, settings, and historical data.
      </p>

      <button 
        onClick={exploreLeague}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Explore Urban Achievers League'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {data && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">League Data:</h2>
          <div className="bg-gray-100 p-4 rounded overflow-auto">
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}