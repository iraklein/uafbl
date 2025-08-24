#!/usr/bin/env node

/**
 * Yahoo Fantasy OAuth Setup
 * Sets up the OAuth flow for accessing Yahoo Fantasy API
 * 
 * Usage: node yahoo-oauth-setup.js
 */

const YahooFantasy = require('yahoo-fantasy')
const fs = require('fs')

// Configuration
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID || 'dj0yJmk9cEtMdnI3cE56bmFhJmQ9WVdrOVYySk5hMDAwVVhNbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PWZh'
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET || 'b656ac05b9263cb24bf13892ebe46c4a91772aa8'

console.log('🏀 Yahoo Fantasy OAuth Setup')
console.log('============================')

// Initialize Yahoo Fantasy client
const yf = new YahooFantasy(
  YAHOO_CLIENT_ID,
  YAHOO_CLIENT_SECRET,
  // Token callback to save tokens
  ({ access_token, refresh_token }) => {
    const tokens = {
      access_token,
      refresh_token,
      created_at: new Date().toISOString()
    }
    
    fs.writeFileSync('./yahoo-tokens.json', JSON.stringify(tokens, null, 2))
    console.log('✅ Tokens saved to yahoo-tokens.json')
    
    return Promise.resolve()
  }
)

console.log('🔑 Yahoo Fantasy client initialized')
console.log('📋 To complete setup:')
console.log('1. The OAuth URL will be generated below')
console.log('2. Visit the URL in your browser')
console.log('3. Authorize the application')
console.log('4. Copy the authorization code from the callback URL')
console.log('5. Run: node complete-yahoo-auth.js <authorization_code>')

// Generate auth URL
try {
  const authUrl = yf.generateAuthUrl()
  console.log('\n🔗 Visit this URL to authorize:')
  console.log(authUrl)
} catch (error) {
  console.error('❌ Error generating auth URL:', error.message)
}