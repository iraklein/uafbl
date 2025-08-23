'use client'

export default function YahooTest() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Yahoo Fantasy API Test</h1>
      
      <p className="mb-4">
        Click the button below to authenticate with Yahoo and explore your fantasy league data.
      </p>

      <a 
        href="/api/auth/yahoo"
        className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 inline-block"
      >
        Connect to Yahoo Fantasy
      </a>

      <div className="mt-6 text-sm text-gray-600">
        <p>This will:</p>
        <ul className="list-disc pl-6 mt-2">
          <li>Redirect you to Yahoo for authentication</li>
          <li>Request read-only access to your fantasy sports data</li>
          <li>Show you what leagues and data are available</li>
        </ul>
      </div>
    </div>
  )
}