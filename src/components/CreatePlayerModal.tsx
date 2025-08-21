import { useState } from 'react'
import Modal from './Modal'
import FormInput from './FormInput'
import { Player } from '../types'

interface CreatePlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (playerName: string) => void | Promise<void>
  initialPlayerName?: string
  loading?: boolean
  title?: string
  confirmText?: string
  cancelText?: string
}

export default function CreatePlayerModal({
  isOpen,
  onClose,
  onConfirm,
  initialPlayerName = '',
  loading = false,
  title = 'Create New Player',
  confirmText = 'Create Player',
  cancelText = 'Cancel'
}: CreatePlayerModalProps) {
  const [playerName, setPlayerName] = useState(initialPlayerName)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedName = playerName.trim()
    if (!trimmedName) {
      setError('Player name is required')
      return
    }

    if (trimmedName.length < 2) {
      setError('Player name must be at least 2 characters')
      return
    }

    setError('')
    
    try {
      await onConfirm(trimmedName)
      setPlayerName('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create player')
    }
  }

  const handleClose = () => {
    setPlayerName('')
    setError('')
    onClose()
  }

  // Update player name when modal opens with initial value
  useState(() => {
    if (isOpen && initialPlayerName) {
      setPlayerName(initialPlayerName)
    }
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <FormInput
            label="Player Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            error={error}
            placeholder="Enter player name..."
            required
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={loading || !playerName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : confirmText}
          </button>
        </div>
      </form>
    </Modal>
  )
}