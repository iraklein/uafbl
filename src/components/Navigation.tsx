'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'

export default function Navigation() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  
  console.log('🧭 Navigation render:', { 
    isAdmin, 
    pathname,
    type: typeof isAdmin,
    willShowAdminTab: isAdmin === true
  })

  const navItems = [
    { href: '/rosters', label: 'Rosters' },
    { href: '/trades', label: 'Trades' },
    { href: '/draft', label: 'Draft' },
    { href: '/draft-results', label: 'Draft Results' },
    { href: '/lsl', label: 'LSL' },
    { href: '/toppers', label: 'Toppers' },
  ]

  // Check if we're on any draft-related page
  const isDraftSection = pathname === '/draft' || pathname === '/assets'

  // Add Admin tab only for admin users
  if (isAdmin) {
    navItems.push({ href: '/admin', label: 'Admin' })
  }

  return (
    <div>
      {/* Main Navigation */}
      <nav className="flex space-x-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              item.href === '/draft' ? 
                (isDraftSection ? 'text-white bg-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100') :
                (pathname === item.href ? 'text-white bg-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Draft Sub-tabs */}
      {isDraftSection && (
        <div className="mt-4 border-b border-gray-200">
          <nav className="flex space-x-8">
            <Link
              href="/draft"
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                pathname === '/draft'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Draft Tracker
            </Link>
            <Link
              href="/assets"
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                pathname === '/assets'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Assets
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}