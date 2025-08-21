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
    { href: '/toppers', label: 'Toppers' },
    { href: '/lsl', label: 'LSL' },
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
      <div className="border-b border-gray-200">
        <div className="overflow-x-auto">
          <nav className="flex space-x-4 sm:space-x-8 min-w-max">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  item.href === '/draft' ? 
                    (isDraftSection ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') :
                    (pathname === item.href ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Draft Sub-tabs */}
      {isDraftSection && (
        <div className="mt-3 sm:mt-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="overflow-x-auto">
              <nav className="flex space-x-4 sm:space-x-8 min-w-max">
                <Link
                  href="/draft"
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    pathname === '/draft'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Draft Tracker
                </Link>
                <Link
                  href="/assets"
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    pathname === '/assets'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Assets
                </Link>
              </nav>
            </div>
            <div className="bg-blue-50 border border-blue-200 px-4 py-1 rounded-lg ml-4 -mt-4">
              <span className="text-sm font-medium text-blue-900">2025-26 Draft</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}