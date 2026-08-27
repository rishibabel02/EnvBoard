import { useState } from 'react'
import Modal from './Modal'
import { extendHold } from '../../api/holds'

const OPTIONS = [15, 30, 60, 120]

export default function ExtendModal({ env, onClose, onSuccess }) {
  const [minutes, setMinutes] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await extendHold(env.hold.id, minutes)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Extend ${env.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-gray-500">Add time to your current hold.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Add time</label>
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map(m => (
              <button key={m} type="button" onClick={() => setMinutes(m)}
                className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                  minutes === m
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? 's' : ''}`}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {loading ? 'Extending…' : `Add ${minutes < 60 ? `${minutes}m` : `${minutes/60}h`}`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
