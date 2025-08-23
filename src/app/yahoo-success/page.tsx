'use client'

import { useState } from 'react'

export default function YahooSuccess() {
  const [leagues, setLeagues] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const exploreData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/yahoo/explore')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch Yahoo data')
      }
      
      setLeagues(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Yahoo Fantasy API Connected!</h1>
      
      <p className="mb-4">
        Successfully authenticated with Yahoo Fantasy Sports API. 
        Now you can explore what data is available in your leagues.
      </p>

      <button 
        onClick={exploreData}
        disabled={loading}
        className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Explore Yahoo Fantasy Data'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {leagues && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Your Yahoo Fantasy Data:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(leagues, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}