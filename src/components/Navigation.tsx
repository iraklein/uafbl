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
    { href: '/assets', label: 'Assets' },
    { href: '/trades', label: 'Trades' },
    { href: '/draft', label: 'Draft' },
    { href: '/draft-results', label: 'Draft Results' },
    { href: '/lsl', label: 'LSL' },
    { href: '/toppers', label: 'Toppers' },
  ]

  // Add Admin tab only for admin users
  if (isAdmin) {
    navItems.push({ href: '/admin', label: 'Admin' })
  }

  return (
    <nav className="flex space-x-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            pathname === item.href
              ? 'text-white bg-indigo-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}