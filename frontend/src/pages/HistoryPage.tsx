import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { listHistory } from '../api/history'
import type { HistoryItem } from '../types'

const ACTION_STYLES: Record<string, string> = {
  claimed:   'bg-emerald-50 text-emerald-700',
  extended:  'bg-blue-50 text-blue-700',
  released:  'bg-gray-100 text-gray-600',
  expired:   'bg-orange-50 text-orange-700',
  reclaimed: 'bg-red-50 text-red-700',
}

const ACTIONS = ['claimed', 'extended', 'released', 'expired', 'reclaimed']

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)    return `${Math.floor(diff)}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

const LIMIT = 20

export default function HistoryPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [entries,  setEntries]  = useState<HistoryItem[]>([])
  const [total,    setTotal]    = useState(0)
  const [offset,   setOffset]   = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  // Filters
  const [action,   setAction]   = useState('')
  const [from,     setFrom]     = useState('')
  const [to,       setTo]       = useState('')

  const load = useCallback((off: number) => {
    if (!id) return
    setLoading(true)
    setError('')
    listHistory(id, {
      limit:  LIMIT,
      offset: off,
      action: action || undefined,
      from:   from   || undefined,
      to:     to     || undefined,
    })
      .then(res => { setEntries(res.data.entries); setTotal(res.data.total) })
      .catch(err => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false))
  }, [id, action, from, to])

  useEffect(() => {
    setOffset(0)
    load(0)
  }, [load])

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOffset(0)
    load(0)
  }

  function handleClearFilters() {
    setAction('')
    setFrom('')
    setTo('')
  }

  const hasFilters = action || from || to
  const totalPages  = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <Layout>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
            ← Board
          </button>
          <span className="text-gray-200">/</span>
          <h1 className="text-xl font-bold text-gray-900">Environment History</h1>
        </div>

        {/* Filter bar */}
        <form onSubmit={handleFilterSubmit} className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
            <select value={action} onChange={e => setAction(e.target.value)}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All actions</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="datetime-local" value={from} onChange={e => setFrom(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="datetime-local" value={to} onChange={e => setTo(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {hasFilters && (
              <button type="button" onClick={handleClearFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">
                Clear
              </button>
            )}
            <button type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 transition-colors">
              Apply
            </button>
          </div>
        </form>

        {/* Results */}
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {hasFilters ? 'No results match your filters' : 'No history yet'}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Row count */}
              <div className="px-5 py-3 border-b border-gray-50 text-xs text-gray-400">
                {total} {total === 1 ? 'entry' : 'entries'}{hasFilters ? ' matching filters' : ''}
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">When</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Holder</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Actor</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-400 tabular-nums whitespace-nowrap">{timeAgo(h.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${ACTION_STYLES[h.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {h.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <UserChip name={h.user_name} color="indigo" />
                      </td>
                      <td className="px-5 py-3.5">
                        {h.actor_name && h.actor_name !== h.user_name
                          ? <UserChip name={h.actor_name} color="purple" />
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        {h.reason ?? <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                <button onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); load(o) }}
                  disabled={offset === 0}
                  className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  ← Previous
                </button>
                <span className="text-gray-400">Page {currentPage} of {totalPages}</span>
                <button onClick={() => { const o = offset + LIMIT; setOffset(o); load(o) }}
                  disabled={offset + LIMIT >= total}
                  className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

function UserChip({ name, color }: { name: string; color: 'indigo' | 'purple' }) {
  if (!name) return <span className="text-gray-300 text-xs">—</span>
  const styles = {
    indigo: { wrap: 'bg-indigo-100', text: 'text-indigo-700' },
    purple: { wrap: 'bg-purple-100', text: 'text-purple-700' },
  }
  const s = styles[color]
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-5 h-5 rounded-full ${s.wrap} flex items-center justify-center shrink-0`}>
        <span className={`text-xs font-semibold ${s.text}`}>{name[0].toUpperCase()}</span>
      </div>
      <span className="text-gray-700 text-xs font-medium">{name}</span>
    </div>
  )
}
