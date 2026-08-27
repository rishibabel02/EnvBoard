import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { listHistory } from '../api/history'

const ACTION_STYLES = {
  claimed:   'bg-emerald-50 text-emerald-700',
  extended:  'bg-blue-50 text-blue-700',
  released:  'bg-gray-100 text-gray-600',
  expired:   'bg-orange-50 text-orange-700',
  reclaimed: 'bg-red-50 text-red-700',
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return `${Math.floor(diff)}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const LIMIT = 20

export default function HistoryPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [page, setPage]       = useState(null)
  const [offset, setOffset]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    listHistory(id, LIMIT, offset)
      .then(res => setPage(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, offset])

  const entries    = page?.entries ?? []
  const total      = page?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <Layout>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
          >
            ← Board
          </button>
          <span className="text-gray-200">/</span>
          <h1 className="text-xl font-bold text-gray-900">Environment History</h1>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No history yet</div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">When</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-400 tabular-nums whitespace-nowrap">
                        {timeAgo(h.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${ACTION_STYLES[h.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {h.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
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
                <button
                  onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
                  disabled={offset === 0}
                  className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-gray-400">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setOffset(o => o + LIMIT)}
                  disabled={offset + LIMIT >= total}
                  className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
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
