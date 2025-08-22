'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  const [pendingTradeCount, setPendingTradeCount] = useState(0)
  
  // Fetch pending trade count for current user (Haight = ID 6)
  useEffect(() => {
    async function fetchPendingTrades() {
      try {
        const response = await fetch('/api/trades?season_id=18')
        if (response.ok) {
          const trades = await response.json()
          // Only count pending trades where I'm the receiver (need to respond)
          const pendingForMe = trades.filter((trade: any) => 
            trade.status === 'pending' && trade.receiver?.id === 6
          )
          setPendingTradeCount(pendingForMe.length)
        }
      } catch (error) {
        console.error('Error fetching pending trades:', error)
      }
    }

    fetchPendingTrades()
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingTrades, 30000)
    return () => clearInterval(interval)
  }, [])

  console.log('🧭 Navigation render:', { 
    isAdmin, 
    pathname,
    type: typeof isAdmin,
    willShowAdminTab: isAdmin === true,
    pendingTradeCount
  })

  const navItems: Array<{ href: string; label: string; badge?: number }> = [
    { href: '/rosters', label: 'Rosters' },
    { href: '/trades', label: 'Trades', badge: pendingTradeCount > 0 ? pendingTradeCount : undefined },
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
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 ${
                  item.href === '/draft' ? 
                    (isDraftSection ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') :
                    (pathname === item.href ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
                }`}
              >
                {item.label}
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
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