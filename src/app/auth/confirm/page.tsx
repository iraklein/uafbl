'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function ConfirmEmail() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Check if user is already signed in from the confirmation
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Failed to confirm email')
          setLoading(false)
          return
        }

        if (session?.user) {
          // User is confirmed and signed in, link to manager record
          const { error: updateError } = await supabase
            .from('managers')
            .update({ auth_id: session.user.id })
            .eq('email', session.user.email)

          if (updateError) {
            console.error('Error linking user to manager:', updateError)
          }

          // Redirect to the main app
          router.push('/')
        } else {
          setError('Email confirmation failed. Please try signing up again.')
          setLoading(false)
        }
      } catch (error) {
        console.error('Confirmation error:', error)
        setError('An error occurred during confirmation')
        setLoading(false)
      }
    }

    handleEmailConfirmation()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Confirming your email...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        {error ? (
          <div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Confirmation Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <a
              href="/auth/signup"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Try signing up again
            </a>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Email Confirmed!</h2>
            <p className="text-gray-600 mb-4">Your account has been successfully verified.</p>
            <p className="text-gray-600">Redirecting you to the app...</p>
          </div>
        )}
      </div>
    </div>
  )
}