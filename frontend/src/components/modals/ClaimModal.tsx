import { useState } from 'react'
import Modal from './Modal'
import { claimEnvironment } from '../../api/holds'
import type { BoardEntry } from '../../types'

const DURATIONS = [
  { label: '30 min',  value: 30  },
  { label: '1 hour',  value: 60  },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
]

interface Props {
  env: BoardEntry
  onClose: () => void
  onSuccess: () => void
}

export default function ClaimModal({ env, onClose, onSuccess }: Props) {
  const [purpose,   setPurpose]   = useState('')
  const [duration,  setDuration]  = useState(60)
  const [custom,    setCustom]    = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const mins = useCustom ? parseInt(custom) : duration
    if (!purpose.trim())        return setError('Purpose is required')
    if (!mins || mins < 1)      return setError('Minimum duration is 1 minute')
    if (mins > 4320)            return setError('Maximum duration is 4320 minutes (72 hours)')

    setLoading(true)
    setError('')
    try {
      await claimEnvironment(env.id, purpose.trim(), mins)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Claim ${env.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Purpose <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder="What are you testing or working on?"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
          <div className="grid grid-cols-2 gap-2">
            {DURATIONS.map(d => (
              <button key={d.value} type="button"
                onClick={() => { setDuration(d.value); setUseCustom(false) }}
                className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                  !useCustom && duration === d.value
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {d.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input type="checkbox" id="custom" checked={useCustom} onChange={e => setUseCustom(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600" />
            <label htmlFor="custom" className="text-sm text-gray-600">Custom:</label>
            <input type="number" min={1} max={4320} value={custom}
              onChange={e => { setCustom(e.target.value); setUseCustom(true) }}
              placeholder="minutes"
              className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
            {loading ? 'Claiming…' : 'Claim Now'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
