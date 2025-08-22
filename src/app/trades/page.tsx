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
    defaultSeasonFilter: 'active_playing'
  })
  const { currentManagerId } = useAuth()
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
      const tradeData = {
        season_id: selectedSeason,
        proposer_manager_id: currentManagerId,
        receiver_manager_id: selectedPartner.id,
        proposer_cash: myCash ? parseInt(myCash) : 0,
        proposer_slots: mySlots ? parseInt(mySlots) : 0,
        receiver_cash: partnerCash ? parseInt(partnerCash) : 0,
        receiver_slots: partnerSlots ? parseInt(partnerSlots) : 0,
        proposer_players: selectedMyPlayers,
        receiver_players: selectedPartnerPlayers
      }

      console.log('Submitting trade proposal:', tradeData)

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

  // Define columns for pending trades (with action buttons)
  const pendingColumns: Column<TradeProposal>[] = [
    {
      key: 'proposer.manager_name',
      header: 'Manager',
      className: 'font-medium text-sm',
      headerClassName: 'w-1/6',
      render: (value, trade) => {
        // Show the other manager's name
        return trade.proposer.id === currentManagerId ? trade.receiver.manager_name : trade.proposer.manager_name
      }
    },
    {
      key: 'proposer_cash',
      header: 'You Give',
      className: 'text-left text-sm',
      headerClassName: 'text-left w-1/3',
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
        
        return items.length > 0 ? items.join(', ') : '-'
      }
    },
    {
      key: 'receiver_cash',
      header: 'You Get',
      className: 'text-left text-sm',
      headerClassName: 'text-left w-1/3',
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
        
        return items.length > 0 ? items.join(', ') : '-'
      }
    },
    {
      key: 'id',
      header: 'Actions',
      className: 'text-center',
      headerClassName: 'text-center w-1/6',
      render: (value, trade) => {
        console.log('Rendering action buttons:', { tradeId: trade.id, receiverId: trade.receiver.id, proposerId: trade.proposer.id, currentManagerId })
        
        // If current user is the receiver, show Accept/Reject buttons
        if (trade.receiver.id === currentManagerId) {
          return (
            <div className="flex gap-1 justify-center">
              <button
                onClick={() => {
                  console.log('Accept button clicked for trade:', trade.id)
                  handleTradeResponse(trade.id, 'accept')
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium"
              >
                Accept
              </button>
              <button
                onClick={() => {
                  console.log('Reject button clicked for trade:', trade.id)
                  handleTradeResponse(trade.id, 'reject')
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium"
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
              className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium"
            >
              Cancel
            </button>
          )
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
      header: 'Manager 1',
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
      header: 'Manager 2',
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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
        <Header />

        <div className="mb-6 sm:mb-8">
          
          {/* Controls section */}
          <div className="mb-4">
            <div className="flex flex-row space-x-3 sm:space-x-4">
              {/* Season Selector */}
              <SeasonSelector
                seasons={seasons}
                selectedSeason={selectedSeason}
                onSeasonChange={setSelectedSeason}
                loading={loading}
              />

              {/* Trade count info box */}
              {selectedSeason && (
                <div className="bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg flex-shrink-0">
                  <span className="text-xs font-medium text-blue-900 sm:text-sm">{tradeProposals.length} accepted trades | {trades.length} player trades | {sortedPlayerTradeCounts.length} players</span>
                </div>
              )}

              {/* Propose Trade Button */}
              <button
                onClick={() => setShowProposeModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-shrink-0"
              >
                Propose Trade
              </button>
            </div>
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
            )}

            {/* Accepted Trades Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Accepted Trades</h3>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Propose Trade</h2>
                  <button
                    onClick={() => {
                      setShowProposeModal(false)
                      resetTradeForm()
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Trade Form Content */}
                {tradeFormLoading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Loading trade form...</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Manager Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Manager to Trade With:
                      </label>
                      <ManagerSearch
                        value={partnerQuery}
                        onChange={setPartnerQuery}
                        managers={managers.filter(m => m.id !== currentManagerId)}
                        onManagerSelect={(manager) => {
                          setSelectedPartner(manager)
                          setPartnerQuery(manager.manager_name)
                        }}
                        placeholder="Search for manager..."
                        className="w-full"
                      />
                    </div>

                    {selectedPartner && (
                      <>
                        {/* Trade Section Headers */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <h3 className="text-lg font-medium text-gray-900 text-center">My Trade</h3>
                          <h3 className="text-lg font-medium text-gray-900 text-center">
                            {selectedPartner?.manager_name}'s Trade
                          </h3>
                        </div>
                        
                        {/* Cash/Slots Section */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {/* My Cash/Slots */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Cash</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={myCash}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '' || parseFloat(value) >= 0) {
                                      setMyCash(value)
                                    }
                                  }}
                                  placeholder="$0"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Slots</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={mySlots}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '' || parseFloat(value) >= 0) {
                                      setMySlots(value)
                                    }
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Partner Cash/Slots */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Cash</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={partnerCash}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '' || parseFloat(value) >= 0) {
                                      setPartnerCash(value)
                                    }
                                  }}
                                  placeholder="$0"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Slots</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={partnerSlots}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '' || parseFloat(value) >= 0) {
                                      setPartnerSlots(value)
                                    }
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Players Section */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* My Players */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">My Players</label>
                            <div className="border border-gray-300 rounded max-h-40 overflow-y-auto">
                              {myRoster.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                  {myRoster.map(player => (
                                    <label key={player.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
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
                                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                      />
                                      <span className="ml-2 text-xs text-gray-900">{player.players.name}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-3 text-center text-gray-500 text-xs">No players on roster</div>
                              )}
                            </div>
                          </div>

                          {/* Partner Players */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Their Players</label>
                            <div className="border border-gray-300 rounded max-h-40 overflow-y-auto">
                              {partnerRoster.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                  {partnerRoster.map(player => (
                                    <label key={player.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
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
                                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                      />
                                      <span className="ml-2 text-xs text-gray-900">{player.players.name}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-3 text-center text-gray-500 text-xs">
                                  {partnerRoster.length === 0 ? 'Loading players...' : 'No players on roster'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowProposeModal(false)
                          resetTradeForm()
                        }}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleTradeSubmit}
                        disabled={!selectedPartner || tradeFormLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {tradeFormLoading ? 'Creating Trade...' : 'Propose Trade'}
                      </button>
                    </div>
                  </div>
                )}
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