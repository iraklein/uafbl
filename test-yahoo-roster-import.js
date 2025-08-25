#!/usr/bin/env node

/**
 * Test Yahoo roster import using stored tokens
 */

const https = require('https')
const fs = require('fs')

// Load tokens
const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))
const accessToken = tokens.access_token

console.log('🏀 Testing Yahoo Fantasy API - Get My Leagues')
console.log('===============================================')

// First, get user's leagues
function getMyLeagues() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      path: '/fantasy/v2/users;use_login=1/games;game_keys=466/leagues?format=json',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }

    console.log('🔍 Fetching user leagues...')

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log(`📊 Response status: ${res.statusCode}`)
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data)
            resolve(response)
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`))
          }
        } else {
          console.log('Error response:', data)
          reject(new Error(`API returned ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

// Get rosters for a specific league
function getLeagueRosters(leagueKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      path: `/fantasy/v2/league/${leagueKey}/teams/roster?format=json`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }

    console.log(`🏀 Fetching rosters for league: ${leagueKey}`)

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log(`📊 Rosters response status: ${res.statusCode}`)
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data)
            resolve(response)
          } catch (error) {
            reject(new Error(`Failed to parse rosters response: ${error.message}`))
          }
        } else {
          console.log('Rosters error response:', data.substring(0, 500))
          reject(new Error(`Rosters API returned ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function main() {
  try {
    // Step 1: Get user's leagues
    const leaguesResponse = await getMyLeagues()
    console.log('✅ Successfully fetched leagues!')
    
    // Parse leagues - Yahoo API has complex nested structure
    let leagues = []
    try {
      console.log('🔍 Parsing Yahoo API response structure...')
      
      // Save raw response for debugging
      fs.writeFileSync('./yahoo-raw-response.json', JSON.stringify(leaguesResponse, null, 2))
      console.log('📝 Raw response saved to yahoo-raw-response.json')
      
      if (leaguesResponse.fantasy_content && leaguesResponse.fantasy_content.users) {
        const users = leaguesResponse.fantasy_content.users
        console.log('👥 Users structure type:', typeof users)
        
        // Handle both array and object users structure
        const usersArray = Array.isArray(users) ? users : [users]
        
        for (const [key, userData] of Object.entries(usersArray)) {
          console.log(`👤 Processing user ${key}:`, typeof userData)
          
          if (userData && userData.user && Array.isArray(userData.user)) {
            const userInfo = userData.user[0] // GUID
            const userGames = userData.user[1] // Games data
            
            console.log('🎮 User games:', userGames?.games ? 'found' : 'not found')
            
            if (userGames && userGames.games) {
              const games = userGames.games
              
              // Handle games structure
              for (const [gameKey, gameData] of Object.entries(games)) {
                if (gameData && gameData.game && Array.isArray(gameData.game)) {
                  const gameInfo = gameData.game[0] // Game metadata
                  const gameLeagues = gameData.game[1] // Leagues data
                  
                  console.log(`🏀 Game ${gameInfo?.name}: leagues`, gameLeagues?.leagues ? 'found' : 'not found')
                  
                  if (gameLeagues && gameLeagues.leagues) {
                    const leaguesData = gameLeagues.leagues
                    
                    for (const [leagueKey, leagueContainer] of Object.entries(leaguesData)) {
                      if (leagueContainer && leagueContainer.league && Array.isArray(leagueContainer.league)) {
                        const leagueInfo = {}
                        leagueContainer.league.forEach(item => Object.assign(leagueInfo, item))
                        leagues.push(leagueInfo)
                        console.log(`📋 Found league: ${leagueInfo.name} (${leagueInfo.league_key})`)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      console.log(`📊 Found ${leagues.length} leagues`)
      
      if (leagues.length === 0) {
        console.log('⚠️ No leagues found')
        console.log('Response structure:', JSON.stringify(leaguesResponse, null, 2).substring(0, 1000) + '...')
        return
      }
      
      // Show league info
      const processedLeagues = []
      for (const leagueData of leagues) {
        try {
          const league = {}
          if (Array.isArray(leagueData)) {
            leagueData.forEach(obj => Object.assign(league, obj))
          } else {
            Object.assign(league, leagueData)
          }
          
          const leagueInfo = {
            key: league.league_key,
            id: league.league_id,
            name: league.name,
            season: league.season,
            num_teams: league.num_teams
          }
          
          processedLeagues.push(leagueInfo)
          console.log(`📋 League: ${leagueInfo.name} (${leagueInfo.key}) - ${leagueInfo.num_teams} teams`)
          
        } catch (error) {
          console.error('❌ Error processing league:', error.message)
        }
      }
      
      // Test roster fetch for first league
      if (processedLeagues.length > 0) {
        const firstLeague = processedLeagues[0]
        console.log(`\\n🎯 Testing roster fetch for: ${firstLeague.name}`)
        
        try {
          const rostersResponse = await getLeagueRosters(firstLeague.key)
          console.log('✅ Successfully fetched rosters!')
          
          // Parse and show basic roster info
          console.log('Rosters response structure:')
          console.log(JSON.stringify(rostersResponse, null, 2).substring(0, 1500) + '...')
          
        } catch (rosterError) {
          console.error('❌ Error fetching rosters:', rosterError.message)
        }
      }
      
      // Save league data for reference
      fs.writeFileSync('./yahoo-leagues-test.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        leagues: processedLeagues,
        raw_response: leaguesResponse
      }, null, 2))
      
      console.log('\\n💾 League data saved to yahoo-leagues-test.json')
      console.log('\\n🎯 Next steps:')
      console.log('1. Review the leagues and identify your UAFBL league')
      console.log('2. Update the roster import API to use the correct league key')
      console.log('3. Test full roster import')
      
    } catch (parseError) {
      console.error('❌ Error parsing leagues:', parseError.message)
      console.log('Raw response:', JSON.stringify(leaguesResponse, null, 2).substring(0, 1000) + '...')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

main()