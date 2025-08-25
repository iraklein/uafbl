import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const clientId = process.env.YAHOO_CLIENT_ID
  
  if (!clientId) {
    return NextResponse.json({ error: 'Yahoo client ID not configured' }, { status: 500 })
  }

  // Yahoo OAuth 2.0 authorization URL  
  // Use localhost for development
  const redirectUri = `http://localhost:3006/api/auth/yahoo/callback`
  
  // Debug: Log what we're sending
  console.log('OAuth Debug Info:', {
    origin: request.nextUrl.origin,
    redirectUri,
    clientId
  })
  
  const authUrl = new URL('https://api.login.yahoo.com/oauth2/request_auth')
  
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'fspt-r') // fspt-r = Fantasy Sports Read permission
  
  console.log('Full OAuth URL:', authUrl.toString())
  
  return NextResponse.redirect(authUrl.toString())
}