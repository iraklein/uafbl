#!/usr/bin/env node

/**
 * Get All Available Players from Yahoo League
 * This endpoint might give us access to the full player pool
 */

const https = require('https')
const fs = require('fs')

// Check if we have tokens
if (!fs.existsSync('./yahoo-tokens.json')) {
  console.error('❌ No tokens found. Please run yahoo-get-token.js first.')
  process.exit(1)
}

const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))

console.log('🏀 Fetching All Available Players from League')
console.log('=============================================')

// Your league key
const LEAGUE_KEY = '466.l.5701'

// Try different endpoints that might give us all players
async function tryEndpoint(path, description) {
  return new Promise((resolve) => {
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

    console.log(`\n🧪 Trying: ${description}`)
    console.log(`📡 ${path}`)

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`)
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data)
            
            // Try to count players
            let playerCount = 0
            if (response.fantasy_content && response.fantasy_content.league) {
              const league = Array.isArray(response.fantasy_content.league) 
                ? response.fantasy_content.league[1] || response.fantasy_content.league[0]
                : response.fantasy_content.league
              
              if (league.players && league.players[0] && league.players[0].player) {
                playerCount = league.players[0].player.length
              }
            }
            
            console.log(`👥 Players found: ${playerCount}`)
            console.log(`📋 Response preview:`)
            console.log(JSON.stringify(response, null, 2).substring(0, 1000) + '...')
            
            resolve({ response, playerCount, path })
            
          } catch (error) {
            console.log(`❌ Parse error: ${error.message}`)
            resolve({ response: null, playerCount: 0, path })
          }
        } else {
          console.log(`❌ Error: ${res.statusCode}`)
          console.log(data.substring(0, 300))
          resolve({ response: null, playerCount: 0, path })
        }
      })
    })

    req.on('error', (error) => {
      console.log(`❌ Request error: ${error.message}`)
      resolve({ response: null, playerCount: 0, path })
    })
    
    req.end()
  })
}

async function main() {
  try {
    console.log(`🔑 Using league: Urban Achievers (${LEAGUE_KEY})`)
    
    const endpoints = [
      {
        path: `/fantasy/v2/league/${LEAGUE_KEY}/players;status=A;start=0;count=100?format=json`,
        description: 'Active players (status=A, count=100)'
      },
      {
        path: `/fantasy/v2/league/${LEAGUE_KEY}/players;status=FA;start=0;count=100?format=json`,
        description: 'Free agents (status=FA, count=100)'
      },
      {
        path: `/fantasy/v2/league/${LEAGUE_KEY}/players;status=W;start=0;count=100?format=json`,
        description: 'Waivers (status=W, count=100)'
      },
      {
        path: `/fantasy/v2/league/${LEAGUE_KEY}/players;sort=NAME;start=0;count=100?format=json`,
        description: 'Sorted by name (count=100)'
      },
      {
        path: `/fantasy/v2/league/${LEAGUE_KEY}/players;sort=OR;start=0;count=100?format=json`,
        description: 'Sorted by overall rank (count=100)'
      },
      {
        path: `/fantasy/v2/league/${LEAGUE_KEY}/players;start=0;count=500?format=json`,
        description: 'All players (count=500)'
      },
      {
        path: `/fantasy/v2/league/${LEAGUE_KEY}/players;start=25;count=25?format=json`,
        description: 'Players 25-49'
      },
      {
        path: `/fantasy/v2/league/${LEAGUE_KEY}/players;start=50;count=25?format=json`,
        description: 'Players 50-74'
      }
    ]
    
    let bestResult = null
    
    for (const endpoint of endpoints) {
      const result = await tryEndpoint(endpoint.path, endpoint.description)
      
      if (result.playerCount > 0) {
        if (!bestResult || result.playerCount > bestResult.playerCount) {
          bestResult = result
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    console.log('\n📊 Summary:')
    if (bestResult && bestResult.playerCount > 0) {
      console.log(`✅ Best result: ${bestResult.playerCount} players from ${bestResult.path}`)
      console.log('\n🎯 Use this endpoint to fetch all players with pagination!')
    } else {
      console.log('❌ No endpoints returned multiple players')
      console.log('\n💡 Possible reasons:')
      console.log('- League is in pre-draft status (draft_status: "predraft")')
      console.log('- Yahoo restricts player access before draft')
      console.log('- Need different API permissions')
      console.log('- Players might only be available after draft or season start')
      
      console.log('\n🔄 Possible solutions:')
      console.log('1. Wait until after the draft')
      console.log('2. Try during the active season')
      console.log('3. Use a different Yahoo league that is active')
      console.log('4. Export data manually from Yahoo Fantasy web interface')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

main()