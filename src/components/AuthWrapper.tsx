'use client'

import { useEffect, useState } from 'react'
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
    console.log('Checking admin status for:', userEmail)
    try {
      const { data, error } = await supabase
        .from('managers')
        .select('is_admin, email, manager_name')
        .eq('email', userEmail)
        .single()

      console.log('Admin check result:', { data, error, userEmail })

      if (!error && data) {
        console.log('Setting admin status to:', data.is_admin)
        setIsAdmin(data.is_admin === true) // Explicitly check for true
      } else {
        console.log('No admin data found or error:', error)
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    // More generous timeout to prevent premature signouts
    const timeoutId = setTimeout(() => {
      console.warn('Auth check timeout, setting loading to false')
      setLoading(false)
      // Don't automatically set user to null - let the auth state listener handle it
    }, 10000) // 10 second timeout instead of 2

    // Check for invitation/recovery tokens in URL and existing session
    const checkAuthTokens = async () => {
      try {
        console.log('Checking auth state...')
        
        // First, always check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('Existing session check:', { user: !!session?.user, error: sessionError })
        
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
            if (data.user.email) {
              await checkAdminStatus(data.user.email)
            }
            
            // Show password setup for first-time logins
            const hasSetPassword = localStorage.getItem('password_setup_complete') || 
                                 localStorage.getItem(`password_setup_complete_${data.user.id}`)
            if (!hasSetPassword) {
              setShowPasswordSetup(true)
            }
            
            setLoading(false)
            window.history.replaceState(null, '', window.location.pathname)
            clearTimeout(timeoutId)
            return
          }
        }
        
        // If we have an existing session (from refresh), use it
        if (session?.user) {
          console.log('Using existing session for user:', session.user.email)
          setUser(session.user)
          if (session.user.email) {
            await checkAdminStatus(session.user.email)
          }
          setLoading(false)
          clearTimeout(timeoutId)
          return
        }
        
        // No session found, but don't immediately show login - let the auth state listener handle the final decision
        console.log('No session found in initial check')
        // The auth state change listener will handle setting loading to false
        
      } catch (error) {
        console.error('Error in auth check:', error)
        setLoading(false)
        setUser(null)
        clearTimeout(timeoutId)
      }
    }
    
    checkAuthTokens()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', { event, hasSession: !!session })
        
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser?.email) {
          await checkAdminStatus(currentUser.email)
        } else {
          setIsAdmin(false)
        }
        
        // Always set loading to false after processing the auth state
        // The INITIAL_SESSION event is fired when the component first loads
        setLoading(false)
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
    console.log('Sign out initiated...')
    try {
      // Force sign out regardless of response
      await supabase.auth.signOut({ scope: 'local' })
      console.log('Sign out completed')
    } catch (err) {
      console.error('Sign out catch error:', err)
    } finally {
      // Always reset state even if signOut fails
      console.log('Resetting local state...')
      setUser(null)
      setIsAdmin(false)
      setShowPasswordSetup(false)
      setLoginError('')
      setEmail('')
      setPassword('')
      
      // Clear local storage
      try {
        localStorage.removeItem('password_setup_complete')
        // Clear user-specific flags
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('password_setup_complete_')) {
            localStorage.removeItem(key)
          }
        })
      } catch (storageErr) {
        console.error('Error clearing localStorage:', storageErr)
      }
      
      console.log('Local state reset complete')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
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
      {/* Auth header with logout */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="text-sm text-gray-600">
              Welcome, {user.email}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
      <AuthProvider isAdmin={isAdmin}>
        {children}
      </AuthProvider>
    </div>
  )
}

