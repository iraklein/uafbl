import Link from 'next/link'
import Navigation from './Navigation'

export default function Header() {
  return (
    <div className="mb-6">
      <Link href="/rosters" className="flex items-center mb-6 hover:opacity-80 transition-opacity">
        <img 
          src="/uafbl-logo.png" 
          alt="UAFBL Logo" 
          className="h-16 w-auto mr-4"
        />
        <h1 className="text-4xl font-bold text-gray-900">UAFBL</h1>
      </Link>
      
      <Navigation />
    </div>
  )
}