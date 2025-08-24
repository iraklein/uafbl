#!/usr/bin/env node

/**
 * Yahoo Fantasy API Explorer
 * Tests different endpoints to find how to get all players
 */

const https = require('https')
const fs = require('fs')

// Check if we have tokens
if (!fs.existsSync('./yahoo-tokens.json')) {
  console.error('❌ No tokens found. Please run yahoo-get-token.js first.')
  process.exit(1)
}

const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))

console.log('🔍 Exploring Yahoo Fantasy API Endpoints')
console.log('=========================================')

// Test different API endpoints
async function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    }

    console.log(`\n🧪 Testing: ${description}`)
    console.log(`📡 ${path}`)

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`)
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data)
            
            // Try to find player count in response
            let playerCount = 0
            if (response.fantasy_content && response.fantasy_content.game) {
              const games = Array.isArray(response.fantasy_content.game) 
                ? response.fantasy_content.game 
                : [response.fantasy_content.game]
              
              for (const game of games) {
                if (game.players && game.players[0] && game.players[0].player) {
                  playerCount = game.players[0].player.length
                  break
                }
              }
            }
            
            console.log(`👥 Players found: ${playerCount}`)
            console.log(`📋 Response structure preview:`)
            console.log(JSON.stringify(response, null, 2).substring(0, 800) + '...')
            
          } catch (error) {
            console.log(`❌ JSON parse error: ${error.message}`)
            console.log(`📄 Raw response preview: ${data.substring(0, 500)}...`)
          }
        } else {
          console.log(`❌ Error: ${data.substring(0, 300)}...`)
        }
        
        resolve()
      })
    })

    req.on('error', (error) => {
      console.log(`❌ Request error: ${error.message}`)
      resolve()
    })
    
    req.end()
  })
}

async function main() {
  const endpoints = [
    {
      path: '/fantasy/v2/game/466/players?format=json&start=0&count=100',
      description: 'Game players (count=100)'
    },
    {
      path: '/fantasy/v2/game/466/players?format=json&start=0&count=500',
      description: 'Game players (count=500)'
    },
    {
      path: '/fantasy/v2/game/466/players?format=json&start=0&count=1000',
      description: 'Game players (count=1000)'
    },
    {
      path: '/fantasy/v2/game/466/players?format=json&status=A&start=0&count=100',
      description: 'Active players only (status=A)'
    },
    {
      path: '/fantasy/v2/game/466/players?format=json&position=C&start=0&count=50',
      description: 'Centers only (position=C)'
    },
    {
      path: '/fantasy/v2/game/466/players?format=json&position=PG&start=0&count=50',
      description: 'Point guards only (position=PG)'
    },
    {
      path: '/fantasy/v2/game/nba/players?format=json&start=0&count=100',
      description: 'NBA players (generic game)'
    }
  ]

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.path, endpoint.description)
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n🎯 Summary:')
  console.log('Try different combinations of parameters:')
  console.log('- Different count values (25, 50, 100, 500, 1000)')
  console.log('- Different start positions (0, 25, 50, 100)')
  console.log('- Filter by status: A (active), NA (not active)')
  console.log('- Filter by position: C, PF, SF, SG, PG')
  console.log('- Try different game codes: nba vs 466')
}

main()