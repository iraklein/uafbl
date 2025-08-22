'use client'

import { createContext, useContext } from 'react'

interface AuthContextType {
  isAdmin: boolean
  currentManagerId?: number
  managerEmail?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
  isAdmin: boolean
  currentManagerId?: number
  managerEmail?: string
}

export function AuthProvider({ children, isAdmin, currentManagerId, managerEmail }: AuthProviderProps) {
  return (
    <AuthContext.Provider value={{ isAdmin, currentManagerId, managerEmail }}>
      {children}
    </AuthContext.Provider>
  )
}