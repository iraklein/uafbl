import Link from 'next/link'
import Navigation from './Navigation'

export default function Header() {
  return (
    <div className="mb-4 sm:mb-6">
      <Link href="/rosters" className="flex items-center mb-4 sm:mb-6 hover:opacity-80 transition-opacity">
        <img 
          src="/uafbl-logo.png" 
          alt="UAFBL Logo" 
          className="h-10 w-auto mr-2 sm:h-16 sm:mr-4"
        />
        <h1 className="text-2xl font-bold text-gray-900 sm:text-4xl">UAFBL</h1>
      </Link>
      
      <Navigation />
    </div>
  )
}