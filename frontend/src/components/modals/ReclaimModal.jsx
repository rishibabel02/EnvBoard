import { useState } from 'react'
import Modal from './Modal'
import { reclaimHold, releaseHold } from '../../api/holds'

export default function ReclaimModal({ env, isOwner, onClose, onSuccess }) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isOwner && !reason.trim()) return setError('Reason is required')
    setLoading(true)
    setError('')
    try {
      if (isOwner) {
        await releaseHold(env.hold.id)
      } else {
        await reclaimHold(env.hold.id, reason.trim())
      }
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Reclaim ${env.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
          This will force-release the hold currently owned by <strong>{env.hold?.holder?.name}</strong>.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why are you reclaiming this environment?"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
            {loading ? 'Reclaiming…' : 'Reclaim'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
