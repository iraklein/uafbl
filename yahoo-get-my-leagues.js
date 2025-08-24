#!/usr/bin/env node

/**
 * Get User's Yahoo Fantasy Leagues
 * Find the user's leagues to access league-specific player data
 */

const https = require('https')
const fs = require('fs')

// Check if we have tokens
if (!fs.existsSync('./yahoo-tokens.json')) {
  console.error('❌ No tokens found. Please run yahoo-get-token.js first.')
  process.exit(1)
}

const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))

console.log('🏀 Finding Your Yahoo Fantasy Leagues')
console.log('=====================================')

// Fetch user's leagues
async function fetchUserLeagues() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      port: 443,
      path: '/fantasy/v2/users;use_login=1/games;game_keys=nba/leagues?format=json',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    }

    console.log('📡 Fetching your leagues...')

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log(`📊 Response status: ${res.statusCode}`)
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data)
            console.log('🔍 Response preview:')
            console.log(JSON.stringify(response, null, 2).substring(0, 1500) + '...')
            resolve(response)
          } catch (error) {
            console.log('❌ JSON parse error:', error.message)
            console.log('Raw response:', data.substring(0, 1000))
            reject(error)
          }
        } else {
          console.log('❌ API Error:', data)
          reject(new Error(`API returned ${res.statusCode}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

// Try alternative endpoints for user leagues
async function fetchUserLeaguesAlt() {
  const endpoints = [
    '/fantasy/v2/users;use_login=1/games/leagues?format=json',
    '/fantasy/v2/users;use_login=1/games;game_codes=nba/leagues?format=json',
    '/fantasy/v2/users;use_login=1/games;game_keys=466/leagues?format=json'
  ]

  for (const path of endpoints) {
    try {
      console.log(`\n📡 Trying endpoint: ${path}`)
      
      const result = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'fantasysports.yahooapis.com',
          port: 443,
          path: path,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Accept': 'application/json'
          }
        }

        const req = https.request(options, (res) => {
          let data = ''
          res.on('data', (chunk) => data += chunk)
          res.on('end', () => {
            console.log(`📊 Status: ${res.statusCode}`)
            if (res.statusCode === 200) {
              try {
                const response = JSON.parse(data)
                resolve(response)
              } catch (e) {
                resolve(null)
              }
            } else {
              resolve(null)
            }
          })
        })

        req.on('error', () => resolve(null))
        req.end()
      })

      if (result) {
        console.log('✅ Success! Response preview:')
        console.log(JSON.stringify(result, null, 2).substring(0, 1000) + '...')
        return result
      }
      
    } catch (error) {
      console.log(`❌ Error with ${path}:`, error.message)
    }
  }
  
  return null
}

async function main() {
  try {
    console.log('🔑 Using stored access token')
    
    let response = await fetchUserLeagues()
    
    if (!response) {
      console.log('\n🔄 Trying alternative endpoints...')
      response = await fetchUserLeaguesAlt()
    }
    
    if (!response) {
      console.error('❌ Could not fetch leagues from any endpoint')
      console.log('\n💡 Possible solutions:')
      console.log('1. Your token may have expired - get a new one')
      console.log('2. You might not have any active NBA leagues')
      console.log('3. The API endpoints may have changed')
      return
    }
    
    // Parse leagues from response
    console.log('\n🔍 Analyzing response for leagues...')
    
    // Save raw response for debugging
    fs.writeFileSync('./yahoo-leagues-response.json', JSON.stringify(response, null, 2))
    console.log('💾 Saved full response to yahoo-leagues-response.json')
    
    console.log('\n🎯 Next steps:')
    console.log('1. Review the response in yahoo-leagues-response.json')
    console.log('2. Look for league_key values')
    console.log('3. Use league_key to fetch all players from your league')
    console.log('\nExample: /fantasy/v2/league/[LEAGUE_KEY]/players')
    
  } catch (error) {
    if (error.message.includes('401')) {
      console.error('❌ Authentication failed - your token has likely expired')
      console.log('Please run: node yahoo-auth-simple.js to get a new token')
    } else {
      console.error('❌ Error:', error.message)
    }
  }
}

main()