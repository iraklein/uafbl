'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AuthProvider } from '../contexts/AuthContext'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [managerName, setManagerName] = useState<string>('')
  const [currentManagerId, setCurrentManagerId] = useState<number | undefined>(undefined)
  const [managerEmail, setManagerEmail] = useState<string | undefined>(undefined)
  
  // Login form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  
  // Password setup states
  const [showPasswordSetup, setShowPasswordSetup] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSetupLoading, setPasswordSetupLoading] = useState(false)
  const [passwordSetupError, setPasswordSetupError] = useState('')

  const checkAdminStatus = async (userEmail: string) => {
    console.log('👑 Checking admin status for:', userEmail)
    const adminStart = performance.now()
    
    try {
      const { data, error } = await supabase
        .from('managers')
        .select('id, is_admin, email, manager_name, team_name')
        .eq('email', userEmail)
        .single()

      const adminTime = performance.now() - adminStart
      console.log(`📊 Admin check took ${adminTime.toFixed(2)}ms`, { 
        data, 
        error: error?.message, 
        userEmail,
        hasData: !!data,
        isAdmin: data?.is_admin,
        managerId: data?.id,
        dataType: typeof data?.is_admin 
      })

      if (!error && data) {
        if (data.is_admin === true) {
          console.log('✅ User is admin - showing admin tab')
          setIsAdmin(true)
        } else {
          console.log('❌ User is not admin - no admin rights')
          setIsAdmin(false)
        }
        
        // Set manager information for use in trade modal and other features
        setCurrentManagerId(data.id)
        setManagerEmail(userEmail)
        
        // Set team name for display
        if (data.team_name) {
          setManagerName(data.team_name)
        }
      } else {
        console.log('❌ User is not admin or error occurred:', error?.message || 'No admin rights')
        setIsAdmin(false)
        setCurrentManagerId(undefined)
        setManagerEmail(undefined)
      }
    } catch (error) {
      const adminTime = performance.now() - adminStart
      console.error(`❌ Admin check exception after ${adminTime.toFixed(2)}ms:`, error)
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    // Quick timeout to avoid infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth check timeout, setting loading to false')
      setLoading(false)
      setUser(null)
    }, 2000) // 2 second timeout

    // Check for invitation/recovery tokens in URL and existing session
    const checkAuthTokens = async () => {
      try {
        console.log('⚡ Auth check starting...')
        
        // Always check for existing session first (most common case)
        const sessionStart = performance.now()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        const sessionTime = performance.now() - sessionStart
        console.log(`📊 Session check took ${sessionTime.toFixed(2)}ms`, { 
          hasUser: !!session?.user, 
          userEmail: session?.user?.email,
          error: sessionError?.message 
        })
        
        // If we have a valid session, use it immediately
        if (session?.user && !sessionError) {
          console.log('✅ Valid session found, processing immediately')
          setUser(session.user)
          if (session.user.email) {
            // Don't await admin check - let it run in background
            checkAdminStatus(session.user.email).catch(console.error)
          }
          setLoading(false)
          clearTimeout(timeoutId)
          return
        }
        
        // Check URL parameters for tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)
        
        const access_token = hashParams.get('access_token') || searchParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token')
        const type = hashParams.get('type') || searchParams.get('type')
        const error = hashParams.get('error') || searchParams.get('error')
        const error_description = hashParams.get('error_description') || searchParams.get('error_description')
        
        console.log('URL tokens:', { hasAccess: !!access_token, hasRefresh: !!refresh_token, type, error })
        
        // Handle auth errors from URL
        if (error) {
          const errorMessage = error_description ? 
            decodeURIComponent(error_description.replace(/\+/g, ' ')) : error
          setLoginError(`Invitation error: ${errorMessage}`)
          setLoading(false)
          window.history.replaceState(null, '', window.location.pathname)
          clearTimeout(timeoutId)
          return
        }
        
        // If we have tokens in URL, process them
        if (access_token && refresh_token && (type === 'invite' || type === 'recovery')) {
          console.log('Processing URL tokens for type:', type)
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
          
          if (error) {
            console.error('Session error:', error)
            setLoginError('Failed to accept invitation. Please try again.')
            setLoading(false)
            clearTimeout(timeoutId)
            return
          }
          
          if (data.user) {
            setUser(data.user)
            
            // Show password setup for first-time logins
            const hasSetPassword = localStorage.getItem('password_setup_complete') || 
                                 localStorage.getItem(`password_setup_complete_${data.user.id}`)
            if (!hasSetPassword) {
              setShowPasswordSetup(true)
            }
            
            setLoading(false)
            window.history.replaceState(null, '', window.location.pathname)
            clearTimeout(timeoutId)
            
            // Run admin check in background after UI updates
            if (data.user.email) {
              checkAdminStatus(data.user.email).catch(console.error)
            }
            return
          }
        }
        
        // No session or tokens found - show login
        console.log('❌ No session or valid tokens found - showing login')
        setLoading(false)
        setUser(null)
        clearTimeout(timeoutId)
        
      } catch (error) {
        console.error('❌ Error in auth check:', error)
        setLoading(false)
        setUser(null)
        clearTimeout(timeoutId)
      }
    }
    
    checkAuthTokens()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', { event, hasSession: !!session })
        
        const currentUser = session?.user ?? null
        
        // Handle sign out events explicitly
        if (event === 'SIGNED_OUT' || !currentUser) {
          console.log('🚪 Handling sign out - clearing all state')
          setUser(null)
          setIsAdmin(false)
          setManagerName('')
          setCurrentManagerId(undefined)
          setManagerEmail(undefined)
          setShowPasswordSetup(false)
          setLoginError('')
          setEmail('')
          setPassword('')
          setIsSigningOut(false)
          setLoading(false)
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Only process sign in events if we're not in the middle of signing out
          if (!isSigningOut) {
            console.log('👤 Processing sign in event')
            setUser(currentUser)
            if (currentUser?.email) {
              // Run admin check in background, don't block UI
              checkAdminStatus(currentUser.email).catch(console.error)
            }
            setLoading(false)
          } else {
            console.log('🛑 Ignoring sign in event - currently signing out')
          }
        }
        
        clearTimeout(timeoutId)
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId) // Clear timeout on cleanup
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setLoginError('Invalid email or password. Only invited managers can access this system.')
        } else {
          setLoginError(error.message)
        }
        return
      }

      // User authenticated successfully

    } catch (error: unknown) {
      setLoginError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoginLoading(false)
    }
  }

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Password setup starting...')
    setPasswordSetupLoading(true)
    setPasswordSetupError('')

    if (newPassword !== confirmPassword) {
      setPasswordSetupError('Passwords do not match')
      setPasswordSetupLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setPasswordSetupError('Password must be at least 6 characters')
      setPasswordSetupLoading(false)
      return
    }

    try {
      console.log('Updating password...')
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      console.log('Password update result:', { error })

      if (error) {
        console.error('Password update error:', error)
        setPasswordSetupError(error.message)
        setPasswordSetupLoading(false)
        return
      }

      // Password set successfully - store this in localStorage to prevent showing again
      console.log('Password set successfully, updating localStorage...')
      localStorage.setItem('password_setup_complete', 'true')
      if (user?.id) {
        localStorage.setItem(`password_setup_complete_${user.id}`, 'true')
      }
      setShowPasswordSetup(false)
      setNewPassword('')
      setConfirmPassword('')
      console.log('Password setup completed')

    } catch (error: unknown) {
      console.error('Password setup catch error:', error)
      setPasswordSetupError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      console.log('Password setup finally block')
      setPasswordSetupLoading(false)
    }
  }

  const handleLogout = async () => {
    console.log('🔐 Sign out initiated...')
    setIsSigningOut(true)
    
    try {
      // Immediately clear state to prevent auto-login during sign out process
      console.log('🗑️ Immediately clearing component state...')
      setUser(null)
      setIsAdmin(false)
      setManagerName('')
      setCurrentManagerId(undefined)
      setManagerEmail(undefined)
      setShowPasswordSetup(false)
      setLoginError('')
      setEmail('')
      setPassword('')
      
      // Clear ALL browser storage aggressively
      console.log('🗑️ Clearing all browser storage...')
      
      // Clear ALL localStorage (more aggressive approach)
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || 
            key.includes('sb-') || 
            key.startsWith('password_setup_complete') ||
            key.includes('auth')) {
          localStorage.removeItem(key)
          console.log('Removed localStorage:', key)
        }
      })
      
      // Clear ALL sessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('supabase') || 
            key.includes('sb-') || 
            key.includes('auth')) {
          sessionStorage.removeItem(key)
          console.log('Removed sessionStorage:', key)
        }
      })
      
      // Clear cookies (if any)
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        if (name.includes('supabase') || name.includes('sb-') || name.includes('auth')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          console.log('Cleared cookie:', name)
        }
      })
      
      console.log('✅ All storage cleared')
    } catch (storageErr) {
      console.error('❌ Error clearing storage:', storageErr)
    }
    
    try {
      // Try global sign out first
      console.log('🌐 Attempting global sign out...')
      const { error: globalError } = await supabase.auth.signOut({ scope: 'global' })
      
      if (globalError) {
        console.warn('⚠️ Global sign out failed, trying local:', globalError.message)
        const { error: localError } = await supabase.auth.signOut({ scope: 'local' })
        
        if (localError) {
          console.error('❌ Local sign out also failed:', localError.message)
        } else {
          console.log('✅ Local sign out successful')
        }
      } else {
        console.log('✅ Global sign out successful')
      }
    } catch (err) {
      console.error('❌ Sign out exception:', err)
    }
    
    // Let auth state change handler process the sign out
    console.log('✅ Sign out completed, letting auth state handler manage the rest')
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <div className="text-xl text-gray-600">Authenticating...</div>
          <div className="text-sm text-gray-400 mt-2">Please wait while we verify your session</div>
        </div>
      </div>
    )
  }

  // Show password setup form if user is authenticated but needs to set password
  if (user && showPasswordSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Set Your Password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Welcome to UAFBL! Please set a password for your account.
            </p>
            <p className="mt-1 text-center text-sm text-gray-500">
              {user.email}
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handlePasswordSetup}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="New password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {passwordSetupError && (
              <div className="text-red-600 text-sm text-center">{passwordSetupError}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={passwordSetupLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {passwordSetupLoading ? 'Setting password...' : 'Set Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              UAFBL League Access
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in with your manager credentials
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {loginError && (
              <div className="text-red-600 text-sm text-center">{loginError}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loginLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loginLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Only invited league managers have access to this system.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Auth header with UAFBL branding and team logo */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            {/* UAFBL Logo and Text (left side) */}
            <Link href="/rosters" className="flex items-center hover:opacity-80 transition-opacity">
              <img 
                src="/uafbl-logo.png" 
                alt="UAFBL Logo" 
                className="h-6 w-auto mr-2"
              />
              <h1 className="text-lg font-bold text-gray-900">UAFBL</h1>
            </Link>
            
            {/* Team Logo with Flyout (right side) */}
            <TeamLogoDropdown 
              managerName={managerName} 
              currentManagerId={currentManagerId}
              onSignOut={handleLogout}
            />
          </div>
        </div>
      </div>
      <AuthProvider isAdmin={isAdmin} currentManagerId={currentManagerId} managerEmail={managerEmail}>
        {children}
      </AuthProvider>
    </div>
  )
}

// Team Logo Dropdown Component
interface TeamLogoDropdownProps {
  managerName: string
  currentManagerId?: number
  onSignOut: () => void
}

function TeamLogoDropdown({ managerName, currentManagerId, onSignOut }: TeamLogoDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Map manager IDs to team logo files
  const getTeamLogo = (managerId?: number): string => {
    if (!managerId) return '/uafbl-logo.png' // fallback
    
    const logoMap: { [key: number]: string } = {
      1: '/Amish.png',
      2: '/Bier.png', 
      3: '/Buchs.png',
      4: '/Gabe.png',
      5: '/Haight.png',
      6: '/Haight.png', // Duplicate of 5 for now
      7: '/Horn.png',
      8: '/Jones.png',
      9: '/Leonine Facies.png',
      10: '/Luskey.png',
      11: '/MikeMac.png',
      12: '/Mitch.png',
      13: '/Peskin.png',
      14: '/Phil.png',
      15: '/Tmac.png',
      16: '/Weeg.png'
    }
    
    return logoMap[managerId] || '/uafbl-logo.png'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
      >
        <img 
          src={getTeamLogo(currentManagerId)} 
          alt={`${managerName} team logo`}
          className="h-8 w-8 rounded-full object-cover border border-gray-300"
        />
        <span className="hidden sm:block">{managerName}</span>
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900">{managerName}</div>
                <div className="text-xs text-gray-500">Team Manager</div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false)
                  onSignOut()
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

