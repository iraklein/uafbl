import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.json({ error: `OAuth error: ${error}` }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 })
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `https://5477ee214f90.ngrok-free.app/api/auth/yahoo/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        response: errorText
      })
      return NextResponse.json({ 
        error: 'Failed to exchange code for token',
        details: errorText,
        status: tokenResponse.status
      }, { status: 500 })
    }

    const tokens = await tokenResponse.json()
    console.log('Yahoo OAuth success:', tokens)

    // Store tokens in session/cookies (for now just redirect with success)
    const response = NextResponse.redirect(`https://5477ee214f90.ngrok-free.app/yahoo-success`)
    
    // Set tokens in httpOnly cookies for security
    response.cookies.set('yahoo_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.expires_in
    })

    if (tokens.refresh_token) {
      response.cookies.set('yahoo_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
    }

    return response

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}