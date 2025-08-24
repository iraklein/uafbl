#!/usr/bin/env node

/**
 * Simple Yahoo Fantasy OAuth Setup
 * Manual 3-step process for Yahoo authentication
 */

const crypto = require('crypto')

// Configuration
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID || 'dj0yJmk9cEtMdnI3cE56bmFhJmQ9WVdrOVYySk5hMDAwVVhNbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PWZh'
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET || 'b656ac05b9263cb24bf13892ebe46c4a91772aa8'

console.log('🏀 Yahoo Fantasy OAuth Setup (3-Step Process)')
console.log('==============================================')
console.log('')

console.log('📋 Step 1: Visit the Authorization URL')
console.log('Copy this URL and paste it in your browser:')
console.log('')

// Create the authorization URL
const redirectUri = 'oob' // out-of-band for manual copy/paste
const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${YAHOO_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&language=en-us`

console.log(`🔗 ${authUrl}`)
console.log('')

console.log('📋 Step 2: Authorize the Application')
console.log('1. Click "Agree" on Yahoo\'s authorization page')
console.log('2. You will see a page with an authorization code')
console.log('3. Copy the authorization code (it will look like: abcd1234...)')
console.log('')

console.log('📋 Step 3: Complete the Authentication')
console.log('Run this command with your authorization code:')
console.log('')
console.log('node yahoo-get-token.js YOUR_AUTHORIZATION_CODE_HERE')
console.log('')

console.log('💡 Example:')
console.log('node yahoo-get-token.js abcd1234efgh5678ijkl')