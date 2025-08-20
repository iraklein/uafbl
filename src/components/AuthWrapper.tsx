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
    try {
      const { data, error } = await supabase
        .from('managers')
        .select('is_admin')
        .eq('email', userEmail)
        .single()

      if (!error && data) {
        setIsAdmin(data.is_admin || false)
      } else {
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    // Check for invitation/recovery tokens in URL
    const checkAuthTokens = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')
      const type = hashParams.get('type')
      
      if (access_token && refresh_token && (type === 'invite' || type === 'recovery')) {
        // Set the session with the tokens
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token
        })
        
        if (!error && data.user) {
          setUser(data.user)
          if (data.user.email) {
            await checkAdminStatus(data.user.email)
          }
          // Only show password setup for actual invitations and if not already completed
          if (type === 'invite' && !localStorage.getItem('password_setup_complete')) {
            setShowPasswordSetup(true)
          }
          setLoading(false)
          // Clear the URL hash
          window.history.replaceState(null, '', window.location.pathname)
          return
        }
      }
      
      // Get initial session if no tokens
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser?.email) {
        await checkAdminStatus(currentUser.email)
      }
      
      setLoading(false)
    }
    
    checkAuthTokens()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser?.email) {
          await checkAdminStatus(currentUser.email)
        } else {
          setIsAdmin(false)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setPasswordSetupError(error.message)
        return
      }

      // Password set successfully - store this in localStorage to prevent showing again
      localStorage.setItem('password_setup_complete', 'true')
      setShowPasswordSetup(false)
      setNewPassword('')
      setConfirmPassword('')

    } catch (error: unknown) {
      setPasswordSetupError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setPasswordSetupLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
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

