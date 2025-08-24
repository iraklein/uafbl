'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import SeasonSelector from '../../components/SeasonSelector'
import LoadingState from '../../components/LoadingState'
import ErrorAlert from '../../components/ErrorAlert'
import DataTable, { Column } from '../../components/DataTable'
import ManagerSearch from '../../components/ManagerSearch'
import { useSeasons } from '../../hooks/useSeasons'
import { useAuth } from '../../contexts/AuthContext'
import { Trade, TradeProposal, Manager, Roster } from '../../types'


interface PlayerTradeCount {
  player_id: number
  player_name: string
  trade_count: number
}

export default function Trades() {
  const { seasons, selectedSeason, setSelectedSeason, loading, error } = useSeasons({
    defaultSeasonFilter: 'active_playing',
    excludeFutureSeasons: true
  })
  const { currentManagerId, isAdmin } = useAuth()
  
  // Debug admin status
  console.log('🔑 Auth Status:', { currentManagerId, isAdmin, type: typeof isAdmin })
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)
  const [tradesError, setTradesError] = useState('')
  const [tradeProposals, setTradeProposals] = useState<TradeProposal[]>([])
  const [proposalsLoading, setProposalsLoading] = useState(false)
  const [proposalsError, setProposalsError] = useState('')
  const [showProposeModal, setShowProposeModal] = useState(false)

  // Trade form state
  const [managers, setManagers] = useState<Manager[]>([])
  const [selectedPartner, setSelectedPartner] = useState<Manager | null>(null)
  const [partnerQuery, setPartnerQuery] = useState<string>('')
  const [myRoster, setMyRoster] = useState<Roster[]>([])
  const [partnerRoster, setPartnerRoster] = useState<Roster[]>([])
  const [selectedMyPlayers, setSelectedMyPlayers] = useState<number[]>([])
  const [selectedPartnerPlayers, setSelectedPartnerPlayers] = useState<number[]>([])
  const [myCash, setMyCash] = useState<string>('')
  const [mySlots, setMySlots] = useState<string>('')
  const [partnerCash, setPartnerCash] = useState<string>('')
  const [partnerSlots, setPartnerSlots] = useState<string>('')
  const [tradeFormLoading, setTradeFormLoading] = useState(false)

  // Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  
  // Validation state
  const [currentSeason, setCurrentSeason] = useState<any>(null)
  const [managerAssets, setManagerAssets] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<{
    myCash?: string
    mySlots?: string
    partnerCash?: string
    partnerSlots?: string
  }>({})
  const [dialogMessage, setDialogMessage] = useState('')

  // Fetch trades when season changes
  useEffect(() => {
    if (!selectedSeason) return

    async function fetchTrades() {
      setTradesLoading(true)
      setTradesError('')

      try {
        const response = await fetch(`/api/admin/trades?season_id=${selectedSeason}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('API error response:', response.status, errorData)
          throw new Error(`API Error ${response.status}: ${errorData.error || 'Failed to fetch trades'}`)
        }
        
        const data = await response.json()
        console.log('Trades data received:', data)
        setTrades(data)
      } catch (error) {
        console.error('Error fetching trades:', error)
        setTradesError(error instanceof Error ? error.message : 'Failed to load trades')
      } finally {
        setTradesLoading(false)
      }
    }

    async function fetchTradeProposals() {
      setProposalsLoading(true)
      setProposalsError('')

      try {
        // Trade proposals are stored in the playing season
        const response = await fetch(`/api/trades?season_id=${selectedSeason}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('API error response:', response.status, errorData)
          throw new Error(`API Error ${response.status}: ${errorData.error || 'Failed to fetch trade proposals'}`)
        }
        
        const data = await response.json()
        console.log('Trade proposals data received:', data)
        setTradeProposals(data)
      } catch (error) {
        console.error('Error fetching trade proposals:', error)
        setProposalsError(error instanceof Error ? error.message : 'Failed to load trade proposals')
      } finally {
        setProposalsLoading(false)
      }
    }

    fetchTrades()
    fetchTradeProposals()
  }, [selectedSeason])

  // Load managers and current user's roster when modal opens or season changes
  useEffect(() => {
    if (showProposeModal && selectedSeason) {
      loadTradeFormData()
    }
  }, [showProposeModal, selectedSeason])

  // Load partner roster when partner is selected or season changes
  useEffect(() => {
    if (selectedPartner?.id && selectedSeason) {
      loadPartnerRoster()
    }
  }, [selectedPartner, selectedSeason])

  useEffect(() => {
    if (showProposeModal) {
      loadValidationData()
    }
  }, [showProposeModal, selectedSeason])

  const loadTradeFormData = async () => {
    setTradeFormLoading(true)
    try {
      // Load managers
      const managersResponse = await fetch('/api/managers')
      if (managersResponse.ok) {
        const managersData = await managersResponse.json()
        setManagers(managersData)
      }

      // Load current user's roster using selected season
      if (selectedSeason && currentManagerId) {
        const myRosterResponse = await fetch(`/api/rosters?season_id=${selectedSeason}&manager_id=${currentManagerId}`)
        if (myRosterResponse.ok) {
          const myRosterData = await myRosterResponse.json()
          setMyRoster(myRosterData)
        }
      }
    } catch (error) {
      console.error('Error loading trade form data:', error)
    } finally {
      setTradeFormLoading(false)
    }
  }

  const loadPartnerRoster = async () => {
    if (!selectedPartner?.id || !selectedSeason) return
    
    try {
      const partnerRosterResponse = await fetch(`/api/rosters?season_id=${selectedSeason}&manager_id=${selectedPartner.id}`)
      if (partnerRosterResponse.ok) {
        const partnerRosterData = await partnerRosterResponse.json()
        setPartnerRoster(partnerRosterData)
      }
    } catch (error) {
      console.error('Error loading partner roster:', error)
    }
  }

  const loadValidationData = async () => {
    if (!selectedSeason) return

    try {
      // Load manager assets for validation
      const assetsResponse = await fetch('/api/manager-assets')
      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json()
        setManagerAssets(assetsData.assets || [])
      }

      // Load current season info to check if offseason
      const seasonsResponse = await fetch('/api/seasons')
      if (seasonsResponse.ok) {
        const seasonsData = await seasonsResponse.json()
        const activeSeason = seasonsData.find((s: any) => s.is_active)
        setCurrentSeason(activeSeason)
      }
    } catch (error) {
      console.error('Error loading validation data:', error)
    }
  }

  const getMaxTradeableAmounts = (managerId: number): { maxCash: number, maxSlots: number } => {
    const managerAsset = managerAssets.find(asset => asset.manager_id === managerId)
    if (!managerAsset) {
      return { maxCash: 0, maxSlots: 0 }
    }

    const currentCash = managerAsset.available_cash || 400
    const currentSlots = managerAsset.available_slots || 3

    // Max cash they can give = current cash - minimum allowed
    const isOffseason = currentSeason?.is_offseason || false
    const minCash = isOffseason ? 350 : 380
    const maxCash = Math.max(0, currentCash - minCash)

    // Max slots they can give = current slots - minimum allowed (2 keeper slots)
    const maxSlots = Math.max(0, currentSlots - 2)

    return { maxCash, maxSlots }
  }

  const validateTradeAssets = (managerId: number, cashChange: number, slotsChange: number): { isValid: boolean, error?: string } => {
    const managerAsset = managerAssets.find(asset => asset.manager_id === managerId)
    if (!managerAsset) {
      return { isValid: false, error: `Manager assets not found for manager ID ${managerId}` }
    }

    // Calculate new totals after trade
    const newCash = (managerAsset.available_cash || 400) + cashChange
    const newSlots = (managerAsset.available_slots || 3) + slotsChange

    // Check slot limits (always 2-5 per UAFBL Constitution)
    if (newSlots < 2 || newSlots > 5) {
      return { isValid: false, error: `Trade would result in ${newSlots} slots (must be 2-5)` }
    }

    // Check cash limits based on season/offseason status
    const isOffseason = currentSeason?.is_offseason || false
    const minCash = isOffseason ? 350 : 380
    const maxCashLimit = isOffseason ? 450 : 420

    if (newCash < minCash || newCash > maxCashLimit) {
      const seasonType = isOffseason ? 'offseason' : 'in-season'
      return { 
        isValid: false, 
        error: `Trade would result in $${newCash} (${seasonType} limit: $${minCash}-$${maxCashLimit})` 
      }
    }

    return { isValid: true }
  }

  const getMaxReceivableAmounts = (managerId: number): { maxCash: number, maxSlots: number } => {
    const managerAsset = managerAssets.find(asset => asset.manager_id === managerId)
    if (!managerAsset) {
      return { maxCash: 0, maxSlots: 0 }
    }

    const currentCash = managerAsset.available_cash || 400
    const currentSlots = managerAsset.available_slots || 3

    // Max cash they can receive = maximum allowed - current cash
    const isOffseason = currentSeason?.is_offseason || false
    const maxCashLimit = isOffseason ? 450 : 420
    const maxCash = Math.max(0, maxCashLimit - currentCash)

    // Max slots they can receive = maximum allowed (5) - current slots
    const maxSlots = Math.max(0, 5 - currentSlots)

    return { maxCash, maxSlots }
  }

  const validateInput = (value: string, type: 'myCash' | 'mySlots' | 'partnerCash' | 'partnerSlots'): string | null => {
    if (!value || value === '') return null
    
    const numValue = parseInt(value)
    if (isNaN(numValue) || numValue < 0) return null
    
    let maxAllowed = 0
    let errorMessage = ''
    
    if (type === 'myCash' && currentManagerId && selectedPartner) {
      maxAllowed = Math.min(
        getMaxTradeableAmounts(currentManagerId).maxCash,
        getMaxReceivableAmounts(selectedPartner.id).maxCash
      )
      const canGive = getMaxTradeableAmounts(currentManagerId).maxCash
      const theyCanReceive = getMaxReceivableAmounts(selectedPartner.id).maxCash
      if (canGive < theyCanReceive) {
        errorMessage = `You can only give $${canGive} cash`
      } else {
        errorMessage = `They can only receive $${theyCanReceive} cash`
      }
    } else if (type === 'mySlots' && currentManagerId && selectedPartner) {
      maxAllowed = Math.min(
        getMaxTradeableAmounts(currentManagerId).maxSlots,
        getMaxReceivableAmounts(selectedPartner.id).maxSlots
      )
      const canGive = getMaxTradeableAmounts(currentManagerId).maxSlots
      const theyCanReceive = getMaxReceivableAmounts(selectedPartner.id).maxSlots
      if (canGive < theyCanReceive) {
        errorMessage = `You can only give ${canGive} slots`
      } else {
        errorMessage = `They can only receive ${theyCanReceive} slots`
      }
    } else if (type === 'partnerCash' && currentManagerId && selectedPartner) {
      maxAllowed = Math.min(
        getMaxTradeableAmounts(selectedPartner.id).maxCash,
        getMaxReceivableAmounts(currentManagerId).maxCash
      )
      const theyCanGive = getMaxTradeableAmounts(selectedPartner.id).maxCash
      const youCanReceive = getMaxReceivableAmounts(currentManagerId).maxCash
      if (theyCanGive < youCanReceive) {
        errorMessage = `They can only give $${theyCanGive} cash`
      } else {
        errorMessage = `You can only receive $${youCanReceive} cash`
      }
    } else if (type === 'partnerSlots' && currentManagerId && selectedPartner) {
      maxAllowed = Math.min(
        getMaxTradeableAmounts(selectedPartner.id).maxSlots,
        getMaxReceivableAmounts(currentManagerId).maxSlots
      )
      const theyCanGive = getMaxTradeableAmounts(selectedPartner.id).maxSlots
      const youCanReceive = getMaxReceivableAmounts(currentManagerId).maxSlots
      if (theyCanGive < youCanReceive) {
        errorMessage = `They can only give ${theyCanGive} slots`
      } else {
        errorMessage = `You can only receive ${youCanReceive} slots`
      }
    }
    
    if (numValue > maxAllowed) {
      return errorMessage
    }
    
    return null
  }

  const isTradeValid = () => {
    // Check if at least one asset is being traded from BOTH sides
    const myAssetsSelected = (
      (myCash && parseInt(myCash) > 0) ||
      (mySlots && parseInt(mySlots) > 0) ||
      selectedMyPlayers.length > 0
    )
    
    const theirAssetsSelected = (
      (partnerCash && parseInt(partnerCash) > 0) ||
      (partnerSlots && parseInt(partnerSlots) > 0) ||
      selectedPartnerPlayers.length > 0
    )
    
    return myAssetsSelected && theirAssetsSelected
  }

  const resetTradeForm = () => {
    setSelectedPartner(null)
    setPartnerQuery('')
    setMyRoster([])
    setPartnerRoster([])
    setSelectedMyPlayers([])
    setSelectedPartnerPlayers([])
    setMyCash('')
    setMySlots('')
    setPartnerCash('')
    setPartnerSlots('')
  }

  // Handle trade proposal submission
  const handleTradeSubmit = async () => {
    if (!selectedPartner || !selectedSeason || !currentManagerId) {
      console.error('Missing required data for trade submission')
      return
    }

    setTradeFormLoading(true)
    try {
      const proposerCash = myCash ? parseInt(myCash) : 0
      const proposerSlots = mySlots ? parseInt(mySlots) : 0
      const receiverCash = partnerCash ? parseInt(partnerCash) : 0
      const receiverSlots = partnerSlots ? parseInt(partnerSlots) : 0

      // Validate trade for proposer (me)
      // Net change: receiving - giving
      const proposerCashChange = receiverCash - proposerCash
      const proposerSlotsChange = receiverSlots - proposerSlots
      const proposerValidation = validateTradeAssets(currentManagerId, proposerCashChange, proposerSlotsChange)
      
      if (!proposerValidation.isValid) {
        setDialogMessage(`Invalid trade for you: ${proposerValidation.error}`)
        setShowErrorDialog(true)
        return
      }

      // Validate trade for receiver (partner)
      // Net change: receiving - giving (opposite of proposer)
      const receiverCashChange = proposerCash - receiverCash
      const receiverSlotsChange = proposerSlots - receiverSlots
      const receiverValidation = validateTradeAssets(selectedPartner.id, receiverCashChange, receiverSlotsChange)
      
      if (!receiverValidation.isValid) {
        setDialogMessage(`Invalid trade for ${selectedPartner.manager_name}: ${receiverValidation.error}`)
        setShowErrorDialog(true)
        return
      }

      const tradeData = {
        season_id: selectedSeason,
        proposer_manager_id: currentManagerId,
        receiver_manager_id: selectedPartner.id,
        proposer_cash: proposerCash,
        proposer_slots: proposerSlots,
        receiver_cash: receiverCash,
        receiver_slots: receiverSlots,
        proposer_players: selectedMyPlayers,
        receiver_players: selectedPartnerPlayers
      }

      console.log('Submitting validated trade proposal:', tradeData)

      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to create trade proposal')
      }

      const result = await response.json()
      console.log('Trade proposal created:', result)

      // Close modal and reset form
      setShowProposeModal(false)
      resetTradeForm()

      // Show success dialog
      setDialogMessage(`Trade proposal sent successfully to ${selectedPartner.manager_name}!`)
      setShowSuccessDialog(true)

      // Refresh trade proposals to show the new one
      const refreshResponse = await fetch(`/api/trades?season_id=${selectedSeason}`)
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        setTradeProposals(refreshData)
      }

    } catch (error) {
      console.error('Error creating trade proposal:', error)
      setDialogMessage(`Failed to create trade proposal: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setShowErrorDialog(true)
    } finally {
      setTradeFormLoading(false)
    }
  }

  // Calculate player trade counts
  const playerTradeCounts: PlayerTradeCount[] = trades.reduce((acc, trade) => {
    const existingPlayer = acc.find(p => p.player_id === trade.player_id)
    if (existingPlayer) {
      existingPlayer.trade_count++
    } else {
      acc.push({
        player_id: trade.player_id,
        player_name: trade.players.name,
        trade_count: 1
      })
    }
    return acc
  }, [] as PlayerTradeCount[])

  // Sort by trade count descending, then by name
  const sortedPlayerTradeCounts = playerTradeCounts.sort((a, b) => {
    if (a.trade_count !== b.trade_count) {
      return b.trade_count - a.trade_count
    }
    return a.player_name.localeCompare(b.player_name)
  })


  // Handle trade response with confirmation
  const handleTradeResponse = async (tradeId: number, action: 'accept' | 'reject') => {
    console.log('HandleTradeResponse called:', { tradeId, action, currentManagerId })
    
    const confirmMessage = action === 'accept' 
      ? 'Are you sure you want to accept this trade proposal?' 
      : 'Are you sure you want to reject this trade proposal?'
    
    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    try {
      const apiUrl = `${window.location.origin}/api/trades/${tradeId}`
      console.log('Making PATCH request to:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: action === 'accept' ? 'accepted' : 'rejected',
          responded_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        // Show success message
        setDialogMessage(`Trade ${action === 'accept' ? 'accepted' : 'rejected'} successfully!`)
        setShowSuccessDialog(true)

        // If trade was accepted, refresh manager assets cache and reload validation data
        if (action === 'accept') {
          try {
            await fetch(`/api/manager-assets?refresh=true&t=${Date.now()}`)
            console.log('Manager assets cache refreshed after trade acceptance')
            // Reload validation data to update the current page's manager assets state
            await loadValidationData()
            console.log('Validation data reloaded after trade acceptance')
          } catch (error) {
            console.warn('Failed to refresh manager assets cache or validation data:', error)
          }
        }

        // Refresh trade proposals
        const seasonForProposals = selectedSeason
        const refreshResponse = await fetch(`/api/trades?season_id=${seasonForProposals}`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setTradeProposals(refreshData)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API response error:', response.status, errorData)
        setDialogMessage(`Failed to ${action} trade: ${errorData.error || 'Please try again.'}`)
        setShowErrorDialog(true)
      }
    } catch (error) {
      console.error('Error responding to trade:', error)
      setDialogMessage(`Failed to ${action} trade. Network error: ${error instanceof Error ? error.message : 'Please try again.'}`)
      setShowErrorDialog(true)
    }
  }

  // Handle trade cancellation
  const handleTradeCancel = async (tradeId: number) => {
    if (!confirm('Are you sure you want to cancel this trade proposal?')) {
      return
    }

    try {
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'canceled',
          responded_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        setDialogMessage('Trade proposal canceled successfully!')
        setShowSuccessDialog(true)

        // Refresh trade proposals
        const seasonForProposals = selectedSeason
        const refreshResponse = await fetch(`/api/trades?season_id=${seasonForProposals}`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setTradeProposals(refreshData)
        }
      } else {
        setDialogMessage('Failed to cancel trade proposal. Please try again.')
        setShowErrorDialog(true)
      }
    } catch (error) {
      console.error('Error canceling trade:', error)
      setDialogMessage('Failed to cancel trade proposal. Please try again.')
      setShowErrorDialog(true)
    }
  }

  // Handle trade revert (admin only)
  const handleTradeRevert = async (tradeId: number) => {
    if (!isAdmin) {
      setDialogMessage('Only administrators can revert trades.')
      setShowErrorDialog(true)
      return
    }

    const confirmMessage = 'Are you sure you want to revert this trade back to pending? This will return all traded players to their original teams.'
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      const apiUrl = `${window.location.origin}/api/trades/${tradeId}/revert`
      console.log('Making POST request to:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setDialogMessage('Trade successfully reverted to pending status!')
        setShowSuccessDialog(true)

        // Refresh manager assets cache since trade affects cash/slots
        try {
          await fetch(`/api/manager-assets?refresh=true&t=${Date.now()}`)
          console.log('Manager assets cache refreshed after trade revert')
        } catch (error) {
          console.warn('Failed to refresh manager assets cache:', error)
        }

        // Refresh trade proposals
        const refreshResponse = await fetch(`/api/trades?season_id=${selectedSeason}`)
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setTradeProposals(refreshData)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API response error:', response.status, errorData)
        setDialogMessage(`Failed to revert trade: ${errorData.error || 'Please try again.'}`)
        setShowErrorDialog(true)
      }
    } catch (error) {
      console.error('Error reverting trade:', error)
      setDialogMessage(`Failed to revert trade. Network error: ${error instanceof Error ? error.message : 'Please try again.'}`)
      setShowErrorDialog(true)
    }
  }

  // Define columns for pending trades (with action buttons)
  const pendingColumns: Column<TradeProposal>[] = [
    {
      key: 'proposer.manager_name',
      header: 'Manager',
      className: 'font-medium text-sm sm:text-base',
      headerClassName: 'w-16 sm:w-1/6 text-xs sm:text-sm',
      render: (value, trade) => {
        // Show the other manager's name
        const managerName = trade.proposer.id === currentManagerId ? trade.receiver.manager_name : trade.proposer.manager_name
        return (
          <div className="break-words">
            {managerName}
          </div>
        )
      }
    },
    {
      key: 'proposer_cash',
      header: 'You Give',
      className: 'text-left text-xs sm:text-sm break-words',
      headerClassName: 'text-left w-32 sm:w-1/3 text-xs sm:text-sm',
      render: (value, trade) => {
        // Show what YOU are giving (cash, slots, and players)
        const items: string[] = []
        
        if (trade.proposer.id === currentManagerId) {
          // You're the proposer
          if (trade.proposer_cash) items.push(`$${trade.proposer_cash}`)
          if (trade.proposer_slots) items.push(`${trade.proposer_slots} slot${trade.proposer_slots > 1 ? 's' : ''}`)
          if ((trade as any).proposer_players && Array.isArray((trade as any).proposer_players) && (trade as any).proposer_players.length > 0) {
            items.push(...(trade as any).proposer_players.map((p: any) => p.name))
          }
        } else {
          // You're the receiver
          if (trade.receiver_cash) items.push(`$${trade.receiver_cash}`)
          if (trade.receiver_slots) items.push(`${trade.receiver_slots} slot${trade.receiver_slots > 1 ? 's' : ''}`)
          if ((trade as any).receiver_players && Array.isArray((trade as any).receiver_players) && (trade as any).receiver_players.length > 0) {
            items.push(...(trade as any).receiver_players.map((p: any) => p.name))
          }
        }
        
        const itemsText = items.length > 0 ? items.join(', ') : '-'
        return (
          <div className="break-words whitespace-pre-wrap">
            {itemsText}
          </div>
        )
      }
    },
    {
      key: 'receiver_cash',
      header: 'You Get',
      className: 'text-left text-xs sm:text-sm break-words',
      headerClassName: 'text-left w-32 sm:w-1/3 text-xs sm:text-sm',
      render: (value, trade) => {
        // Show what YOU are getting (cash, slots, and players)
        const items: string[] = []
        
        if (trade.proposer.id === currentManagerId) {
          // You're the proposer
          if (trade.receiver_cash) items.push(`$${trade.receiver_cash}`)
          if (trade.receiver_slots) items.push(`${trade.receiver_slots} slot${trade.receiver_slots > 1 ? 's' : ''}`)
          if ((trade as any).receiver_players && (trade as any).receiver_players.length > 0) {
            items.push(...(trade as any).receiver_players.map((p: any) => p.name))
          }
        } else {
          // You're the receiver
          if (trade.proposer_cash) items.push(`$${trade.proposer_cash}`)
          if (trade.proposer_slots) items.push(`${trade.proposer_slots} slot${trade.proposer_slots > 1 ? 's' : ''}`)
          if ((trade as any).proposer_players && (trade as any).proposer_players.length > 0) {
            items.push(...(trade as any).proposer_players.map((p: any) => p.name))
          }
        }
        
        const itemsText = items.length > 0 ? items.join(', ') : '-'
        return (
          <div className="break-words whitespace-pre-wrap">
            {itemsText}
          </div>
        )
      }
    },
    {
      key: 'id',
      header: 'Actions',
      className: 'text-center',
      headerClassName: 'text-center w-20 sm:w-1/6 text-xs sm:text-sm',
      render: (value, trade) => {
        console.log('🔍 Rendering action buttons for pending trade:', { 
          tradeId: trade.id, 
          status: trade.status, 
          statusType: typeof trade.status
        })
        
        // For pending trades, show user action buttons
        if (trade.status === 'pending') {
          // If current user is the receiver, show Accept/Reject buttons
          if (trade.receiver.id === currentManagerId) {
            return (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 justify-center">
                <button
                  onClick={() => {
                    console.log('Accept button clicked for trade:', trade.id)
                    handleTradeResponse(trade.id, 'accept')
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:px-2 sm:py-1 rounded text-sm sm:text-xs font-medium min-w-0"
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    console.log('Reject button clicked for trade:', trade.id)
                    handleTradeResponse(trade.id, 'reject')
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-2 sm:py-1 rounded text-sm sm:text-xs font-medium min-w-0"
                >
                  Reject
                </button>
              </div>
            )
          }
          // If current user is the proposer, show cancel button
          else if (trade.proposer.id === currentManagerId) {
            return (
              <button
                onClick={() => handleTradeCancel(trade.id)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-2 sm:py-1 rounded text-sm sm:text-xs font-medium min-w-0"
              >
                Cancel
              </button>
            )
          }
        }
        
        return null
      }
    }
  ]

  // Define columns for the trade proposals table
  const proposalColumns: Column<TradeProposal>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'text-sm text-gray-600 font-mono',
      headerClassName: 'w-12',
      render: (value) => value
    },
    {
      key: 'created_at',
      header: 'Date',
      className: 'text-sm text-gray-600',
      headerClassName: 'w-16',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'proposer.manager_name',
      header: 'Manager',
      className: 'font-bold text-sm bg-blue-50',
      headerClassName: 'w-24 bg-blue-100 font-bold text-blue-900'
    },
    {
      key: 'proposer_cash',
      header: 'Cash Sent',
      className: 'text-center text-sm bg-blue-50',
      headerClassName: 'text-center w-16 bg-blue-100 text-xs text-blue-900',
      render: (value) => value ? `$${value}` : '-'
    },
    {
      key: 'proposer_slots',
      header: 'Slots Sent',
      className: 'text-center text-sm bg-blue-50',
      headerClassName: 'text-center w-16 bg-blue-100 text-xs text-blue-900',
      render: (value) => value || '-'
    },
    {
      key: 'proposer_players',
      header: 'Players Sent',
      className: 'text-sm bg-blue-50',
      headerClassName: 'w-48 bg-blue-100 text-xs text-blue-900',
      render: (value, trade) => {
        if (!trade.proposer_players || trade.proposer_players.length === 0) {
          return <span className="text-gray-400">None</span>
        }
        return (
          <div className="space-y-1">
            {trade.proposer_players.map((player: any, index: number) => (
              <div key={player.id} className="text-xs">
                {player.name}
              </div>
            ))}
          </div>
        )
      }
    },
    {
      key: 'receiver.manager_name',
      header: 'Manager',
      className: 'font-bold text-sm bg-green-50',
      headerClassName: 'w-24 bg-green-100 font-bold text-green-900'
    },
    {
      key: 'receiver_cash',
      header: 'Cash Sent',
      className: 'text-center text-sm bg-green-50',
      headerClassName: 'text-center w-16 bg-green-100 text-xs text-green-900',
      render: (value) => value ? `$${value}` : '-'
    },
    {
      key: 'receiver_slots',
      header: 'Slots Sent',
      className: 'text-center text-sm bg-green-50',
      headerClassName: 'text-center w-16 bg-green-100 text-xs text-green-900',
      render: (value) => value || '-'
    },
    {
      key: 'receiver_players',
      header: 'Players Sent',
      className: 'text-sm bg-green-50',
      headerClassName: 'w-48 bg-green-100 text-xs text-green-900',
      render: (value, trade) => {
        if (!trade.receiver_players || trade.receiver_players.length === 0) {
          return <span className="text-gray-400">None</span>
        }
        return (
          <div className="space-y-1">
            {trade.receiver_players.map((player: any, index: number) => (
              <div key={player.id} className="text-xs">
                {player.name}
              </div>
            ))}
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: '',
      className: 'text-center',
      headerClassName: 'w-8',
      render: (value, trade) => {
        // For accepted trades, show admin revert icon
        if (trade.status === 'accepted' && isAdmin) {
          return (
            <button
              onClick={() => {
                console.log('Revert button clicked for trade:', trade.id)
                handleTradeRevert(trade.id)
              }}
              className="text-orange-600 hover:text-orange-700 p-1 rounded hover:bg-orange-50"
              title="Revert trade back to pending status"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          )
        }
        
        // For other cases, return empty cell
        return null
      }
    }
  ]

  // Define columns for the player trade counts table
  const columns: Column<PlayerTradeCount>[] = [
    {
      key: 'player_name',
      header: 'Player',
      className: 'font-medium',
      headerClassName: 'w-3/4'
    },
    {
      key: 'trade_count',
      header: 'Trades',
      className: 'text-center',
      headerClassName: 'text-center w-1/4'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-4 sm:pb-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
        <Header />

        <div className="mb-6 sm:mb-8">
          
          {/* Controls section */}
          <div className="mb-4">
            {/* Season Selector and Trade Info Row */}
            <div className="flex flex-row space-x-3 sm:space-x-4 mb-3 sm:mb-0">
              {/* Season Selector */}
              <div className="flex-shrink-0">
                <SeasonSelector
                  seasons={seasons}
                  selectedSeason={selectedSeason}
                  onSeasonChange={setSelectedSeason}
                  loading={loading}
                  className="px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-xs sm:text-sm w-22 sm:w-26"
                />
              </div>

              {/* Trade count info box */}
              {selectedSeason && (
                <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg flex-shrink-0">
                  <div className="text-xs font-medium text-blue-900 sm:text-sm">
                    <span>{tradeProposals.length} accepted</span>
                    <span className="mx-1">|</span>
                    <span>{sortedPlayerTradeCounts.length} players</span>
                    <span className="mx-1">|</span>
                    <span>{trades.length} player trades</span>
                  </div>
                </div>
              )}

              {/* Propose Trade Button - positioned for desktop */}
              <button
                onClick={() => setShowProposeModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-auto flex-shrink-0 hidden sm:block"
              >
                Propose Trade
              </button>
            </div>
            
            {/* Propose Trade Button - full width on mobile only */}
            <button
              onClick={() => setShowProposeModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full block sm:hidden"
            >
              Propose Trade
            </button>
          </div>
        </div>

        <ErrorAlert error={error} />
        <ErrorAlert error={tradesError} />
        <ErrorAlert error={proposalsError} />

        {loading ? (
          <LoadingState message="Loading seasons..." />
        ) : (tradesLoading || proposalsLoading) ? (
          <LoadingState message="Loading trades..." />
        ) : selectedSeason ? (
          <>
            {/* Pending Trades Section - Only for involved managers */}
            {tradeProposals.filter(trade => 
              trade.status === 'pending' && 
              (trade.receiver.id === currentManagerId || trade.proposer.id === currentManagerId)
            ).length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Your Pending Trades</h3>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                    {tradeProposals.filter(trade => 
                      trade.status === 'pending' && 
                      (trade.receiver.id === currentManagerId || trade.proposer.id === currentManagerId)
                    ).length} Pending
                  </span>
                </div>
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <DataTable
                    columns={pendingColumns}
                    data={tradeProposals.filter(trade => 
                      trade.status === 'pending' && 
                      (trade.receiver.id === currentManagerId || trade.proposer.id === currentManagerId)
                    )}
                    emptyMessage="No pending trades involving you."
                    size="sm"
                  />
                </div>
              </div>
            )}

            {/* Accepted Trades Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Accepted Trades
                {isAdmin && <span className="text-sm text-blue-600 ml-2">(Admin Mode)</span>}
              </h3>
              <DataTable
                columns={proposalColumns}
                data={tradeProposals.filter(trade => trade.status === 'accepted')}
                emptyMessage="No accepted trades found for this season."
                size="sm"
                headerClassName="text-gray-900"
              />
            </div>

            {/* Player Trade Counts Table */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">In-Season Player Trades</h3>
              <DataTable
                columns={columns}
                data={sortedPlayerTradeCounts}
                emptyMessage="No trades found for this season."
                size="sm"
              />
            </div>
          </>
        ) : (
          <LoadingState message="Please select a season to view trades." />
        )}

        {/* Propose Trade Modal */}
        {showProposeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-2 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-2 sm:my-8 flex flex-col min-h-0" style={{ maxHeight: 'calc(100vh - 16px)' }}>
              {/* Header - Fixed */}
              <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center">
                  {!tradeFormLoading ? (
                    <div className="flex items-center space-x-3">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Propose Trade with</h2>
                      <div className="w-64">
                        <ManagerSearch
                          value={partnerQuery}
                          onChange={setPartnerQuery}
                          managers={managers.filter(m => m.id !== currentManagerId)}
                          onManagerSelect={(manager) => {
                            setSelectedPartner(manager)
                            setPartnerQuery(manager.manager_name)
                          }}
                          placeholder="Select Manager"
                          className="w-full"
                          autoFocus={true}
                        />
                      </div>
                    </div>
                  ) : (
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Propose Trade</h2>
                  )}
                  <button
                    onClick={() => {
                      setShowProposeModal(false)
                      resetTradeForm()
                    }}
                    className="text-gray-400 hover:text-gray-600 p-2 sm:p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Trade Form Content */}
                {tradeFormLoading ? (
                  <div className="text-center pb-8">
                    <div className="text-gray-500">Loading trade form...</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                        {/* Trade Packages Container */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* My Trade Section */}
                          <div className="mb-8 lg:mb-0">
                          <h3 className="text-lg font-medium text-gray-900 text-center bg-blue-50 py-3 rounded-lg mb-4">
                            My Trade Package
                          </h3>
                          
                          {/* My Assets */}
                          <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cash</label>
                                {currentManagerId && (
                                  <p className="text-xs text-gray-600 mb-2">
                                    Max: ${getMaxTradeableAmounts(currentManagerId).maxCash}
                                  </p>
                                )}
                                <input
                                  type="number"
                                  min="0"
                                  max={currentManagerId && selectedPartner ? Math.min(
                                    getMaxTradeableAmounts(currentManagerId).maxCash,
                                    getMaxReceivableAmounts(selectedPartner.id).maxCash
                                  ) : undefined}
                                  value={myCash}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setMyCash(value)
                                    
                                    // Validate and set error
                                    const error = validateInput(value, 'myCash')
                                    setValidationErrors(prev => ({
                                      ...prev,
                                      myCash: error || undefined
                                    }))
                                  }}
                                  placeholder="$0"
                                  className={`w-full px-3 py-2 text-base border rounded-md focus:outline-none focus:ring-2 text-gray-900 ${
                                    validationErrors.myCash 
                                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                  }`}
                                />
                                {validationErrors.myCash && (
                                  <p className="text-red-600 text-xs mt-1">{validationErrors.myCash}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slots</label>
                                {currentManagerId && (
                                  <p className="text-xs text-gray-600 mb-2">
                                    Max: {getMaxTradeableAmounts(currentManagerId).maxSlots}
                                  </p>
                                )}
                                <input
                                  type="number"
                                  min="0"
                                  max={currentManagerId && selectedPartner ? Math.min(
                                    getMaxTradeableAmounts(currentManagerId).maxSlots,
                                    getMaxReceivableAmounts(selectedPartner.id).maxSlots
                                  ) : undefined}
                                  value={mySlots}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setMySlots(value)
                                    
                                    // Validate and set error
                                    const error = validateInput(value, 'mySlots')
                                    setValidationErrors(prev => ({
                                      ...prev,
                                      mySlots: error || undefined
                                    }))
                                  }}
                                  placeholder="0"
                                  className={`w-full px-3 py-2 text-base border rounded-md focus:outline-none focus:ring-2 text-gray-900 ${
                                    validationErrors.mySlots 
                                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                  }`}
                                />
                                {validationErrors.mySlots && (
                                  <p className="text-red-600 text-xs mt-1">{validationErrors.mySlots}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* My Players */}
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <label className="block text-sm font-medium text-blue-900 mb-3">My Players</label>
                            <div className="border border-blue-200 rounded-md min-h-96 bg-white">
                              {myRoster.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                  {myRoster.map(player => (
                                    <label key={player.id} className="flex items-center p-3 hover:bg-blue-50 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedMyPlayers.includes(player.players.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedMyPlayers([...selectedMyPlayers, player.players.id])
                                          } else {
                                            setSelectedMyPlayers(selectedMyPlayers.filter(id => id !== player.players.id))
                                          }
                                        }}
                                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <span className="ml-3 text-sm text-gray-900">{player.players.name}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 text-center text-gray-500 text-sm">No players on roster</div>
                              )}
                            </div>
                          </div>
                        </div>

                          {/* Partner Trade Section */}
                          <div className="mb-6 lg:mb-0">
                          <h3 className="text-lg font-medium text-gray-900 text-center bg-green-50 py-3 rounded-lg mb-4">
                            {selectedPartner?.manager_name ? `${selectedPartner.manager_name}'s Trade Package` : 'Their Trade Package'}
                          </h3>
                          
                          {/* Partner Assets */}
                          <div className="bg-green-50 p-4 rounded-lg mb-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cash</label>
                                {selectedPartner && currentManagerId && (
                                  <p className="text-xs text-gray-600 mb-2">
                                    Max you can receive: ${getMaxReceivableAmounts(currentManagerId).maxCash}
                                  </p>
                                )}
                                <input
                                  type="number"
                                  min="0"
                                  max={selectedPartner && currentManagerId ? Math.min(
                                    getMaxTradeableAmounts(selectedPartner.id).maxCash,
                                    getMaxReceivableAmounts(currentManagerId).maxCash
                                  ) : undefined}
                                  value={partnerCash}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setPartnerCash(value)
                                    
                                    // Validate and set error
                                    const error = validateInput(value, 'partnerCash')
                                    setValidationErrors(prev => ({
                                      ...prev,
                                      partnerCash: error || undefined
                                    }))
                                  }}
                                  placeholder="$0"
                                  className={`w-full px-3 py-2 text-base border rounded-md focus:outline-none focus:ring-2 text-gray-900 ${
                                    validationErrors.partnerCash 
                                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                      : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                                  }`}
                                />
                                {validationErrors.partnerCash && (
                                  <p className="text-red-600 text-xs mt-1">{validationErrors.partnerCash}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slots</label>
                                {selectedPartner && currentManagerId && (
                                  <p className="text-xs text-gray-600 mb-2">
                                    Max you can receive: {getMaxReceivableAmounts(currentManagerId).maxSlots}
                                  </p>
                                )}
                                <input
                                  type="number"
                                  min="0"
                                  max={selectedPartner && currentManagerId ? Math.min(
                                    getMaxTradeableAmounts(selectedPartner.id).maxSlots,
                                    getMaxReceivableAmounts(currentManagerId).maxSlots
                                  ) : undefined}
                                  value={partnerSlots}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setPartnerSlots(value)
                                    
                                    // Validate and set error
                                    const error = validateInput(value, 'partnerSlots')
                                    setValidationErrors(prev => ({
                                      ...prev,
                                      partnerSlots: error || undefined
                                    }))
                                  }}
                                  placeholder="0"
                                  className={`w-full px-3 py-2 text-base border rounded-md focus:outline-none focus:ring-2 text-gray-900 ${
                                    validationErrors.partnerSlots 
                                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                      : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                                  }`}
                                />
                                {validationErrors.partnerSlots && (
                                  <p className="text-red-600 text-xs mt-1">{validationErrors.partnerSlots}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Partner Players */}
                          <div className="bg-green-50 p-4 rounded-lg">
                            <label className="block text-sm font-medium text-green-900 mb-3">Their Players</label>
                            <div className="border border-green-200 rounded-md min-h-96 bg-white">
                              {partnerRoster.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                  {partnerRoster.map(player => (
                                    <label key={player.id} className="flex items-center p-3 hover:bg-green-50 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedPartnerPlayers.includes(player.players.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedPartnerPlayers([...selectedPartnerPlayers, player.players.id])
                                          } else {
                                            setSelectedPartnerPlayers(selectedPartnerPlayers.filter(id => id !== player.players.id))
                                          }
                                        }}
                                        className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                      />
                                      <span className="ml-3 text-sm text-gray-900">{player.players.name}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                  {partnerRoster.length === 0 ? 'Loading players...' : 'No players on roster'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="border-t border-gray-200 p-4 sm:p-6 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => {
                      setShowProposeModal(false)
                      resetTradeForm()
                    }}
                    className="w-full sm:w-auto px-6 py-3 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTradeSubmit}
                    disabled={!selectedPartner || tradeFormLoading || !isTradeValid()}
                    className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {tradeFormLoading ? 'Creating Trade...' : 'Propose Trade'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Dialog */}
        {showSuccessDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
                  <p className="text-sm text-gray-600 mb-4">{dialogMessage}</p>
                  <button
                    onClick={() => setShowSuccessDialog(false)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Dialog */}
        {showErrorDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                  <p className="text-sm text-gray-600 mb-4">{dialogMessage}</p>
                  <button
                    onClick={() => setShowErrorDialog(false)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}