import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

// Levenshtein distance function for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Normalize name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[ÿ]/g, 'y')
    .replace(/[ž]/g, 'z')
    .replace(/[š]/g, 's')
    .replace(/[đ]/g, 'd')
    .replace(/[ć]/g, 'c')
    .replace(/[č]/g, 'c')
    .replace(/[ř]/g, 'r')
    .replace(/[ň]/g, 'n')
    .replace(/[ī]/g, 'i')
    .replace(/[ņ]/g, 'n')
    .replace(/[ş]/g, 's')
    .replace(/[ğ]/g, 'g')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ü]/g, 'u')
    .replace(/[.]/g, '')
    .replace(/[']/g, '')
    .replace(/[-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function GET() {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log('Starting comprehensive duplicate analysis...')
    
    // Get ALL players using pagination to bypass Supabase default limits
    let allPlayers: any[] = []
    let hasMore = true
    let offset = 0
    const pageSize = 1000

    console.log('Fetching all players with pagination...')
    while (hasMore) {
      const { data: pageData, error: pageError } = await supabase
        .from('players')
        .select('id, name')
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (pageError) {
        return NextResponse.json({ error: pageError.message }, { status: 500 })
      }

      if (pageData && pageData.length > 0) {
        allPlayers = allPlayers.concat(pageData)
        offset += pageSize
        hasMore = pageData.length === pageSize
      } else {
        hasMore = false
      }
    }

    console.log(`Fetched ${allPlayers.length} total players`)

    const duplicateGroups: any[] = []
    const processedIds = new Set<number>()

    // Normalize all names first for efficiency
    const normalizedPlayers = allPlayers.map(player => ({
      ...player,
      normalized: normalizeName(player.name)
    }))

    console.log('Analyzing for duplicates...')

    for (let i = 0; i < normalizedPlayers.length; i++) {
      const player1 = normalizedPlayers[i]
      
      if (processedIds.has(player1.id)) {
        continue
      }

      const potentialDuplicates = [player1]

      for (let j = i + 1; j < normalizedPlayers.length; j++) {
        const player2 = normalizedPlayers[j]
        
        if (processedIds.has(player2.id)) {
          continue
        }

        let isDuplicate = false

        // 1. Exact match (normalized)
        if (player1.normalized === player2.normalized) {
          isDuplicate = true
        }
        
        // 2. Fuzzy match with Levenshtein distance
        else {
          const distance = levenshteinDistance(player1.normalized, player2.normalized)
          const maxLength = Math.max(player1.normalized.length, player2.normalized.length)
          const similarity = 1 - (distance / maxLength)
          
          if (similarity >= 0.85 && distance <= 3) {
            isDuplicate = true
          }
        }

        // 3. Pattern matching for common variations
        if (!isDuplicate) {
          const name1Parts = player1.normalized.split(' ')
          const name2Parts = player2.normalized.split(' ')
          
          // Check for nickname variations (e.g., "RJ" vs "R.J." vs "R J")
          const cleanName1 = player1.normalized.replace(/[.\s]/g, '').toLowerCase()
          const cleanName2 = player2.normalized.replace(/[.\s]/g, '').toLowerCase()
          
          if (cleanName1 === cleanName2) {
            isDuplicate = true
          }
          
          // Check for Jr/Sr variations
          if (!isDuplicate && name1Parts.length >= 2 && name2Parts.length >= 2) {
            const baseName1 = name1Parts.filter(part => !['jr', 'sr', 'ii', 'iii', 'iv'].includes(part)).join(' ')
            const baseName2 = name2Parts.filter(part => !['jr', 'sr', 'ii', 'iii', 'iv'].includes(part)).join(' ')
            
            if (baseName1 === baseName2 && baseName1.length > 5) {
              isDuplicate = true
            }
          }
        }

        if (isDuplicate) {
          potentialDuplicates.push(player2)
          processedIds.add(player2.id)
        }
      }

      if (potentialDuplicates.length > 1) {
        duplicateGroups.push({
          players: potentialDuplicates.map(p => ({ id: p.id, name: p.name })),
          normalized_name: player1.normalized
        })
      }

      processedIds.add(player1.id)
    }

    console.log(`Found ${duplicateGroups.length} potential duplicate groups`)

    return NextResponse.json({
      totalPlayers: allPlayers.length,
      duplicateGroups: duplicateGroups,
      summary: {
        totalGroups: duplicateGroups.length,
        totalDuplicatePlayers: duplicateGroups.reduce((sum, group) => sum + group.players.length, 0)
      }
    })

  } catch (error) {
    console.error('Error in duplicate analysis:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}