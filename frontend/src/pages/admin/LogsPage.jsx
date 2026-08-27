import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { listLogs, listAdminActions } from '../../api/admin'

function UAModal({ ua, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">User Agent</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700 font-mono break-all leading-relaxed">{ua}</p>
        </div>
      </div>
    </div>
  )
}

const EVENT_STYLE = {
  login_success:  'bg-emerald-50 text-emerald-700',
  login_failed:   'bg-red-50 text-red-600',
  hold_claimed:   'bg-blue-50 text-blue-700',
  hold_extended:  'bg-indigo-50 text-indigo-700',
  hold_released:  'bg-gray-100 text-gray-600',
  hold_reclaimed: 'bg-orange-50 text-orange-700',
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return `${Math.floor(diff)}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function LogsPage() {
  const [tab,     setTab]     = useState('logs')
  const [logs,    setLogs]    = useState([])
  const [actions, setActions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandUA,  setExpandUA]  = useState(null)

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    Promise.all([listLogs(), listAdminActions()])
      .then(([l, a]) => { setLogs(l.data ?? []); setActions(a.data ?? []) })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { load() }, [])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[['logs', 'System Logs'], ['actions', 'Admin Actions']].map(([value, label]) => (
            <button key={value} onClick={() => setTab(value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-400 py-12 text-center">Loading…</p> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {tab === 'logs' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['When', 'User', 'Event', 'IP Address', 'User Agent'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">No logs yet</td></tr>
                ) : logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap tabular-nums">{timeAgo(l.created_at)}</td>
                    <td className="px-5 py-3.5">
                      {l.user_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-indigo-700 text-xs font-semibold">{l.user_name[0].toUpperCase()}</span>
                          </div>
                          <span className="text-gray-700 text-xs font-medium">{l.user_name}</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${EVENT_STYLE[l.event] ?? 'bg-gray-100 text-gray-600'}`}>
                        {l.event}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{l.ip_address ?? '—'}</td>
                    <td
                      className="px-5 py-3.5 text-gray-400 text-xs max-w-xs truncate hover:text-indigo-600 transition-colors"
                      style={{ cursor: l.user_agent ? 'pointer' : 'default' }}
                      onClick={() => l.user_agent && setExpandUA(l.user_agent)}
                      title={l.user_agent ? 'Click to view full user agent' : undefined}
                    >{l.user_agent ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['When', 'Admin', 'Action', 'Target', 'Details'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {actions.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">No actions yet</td></tr>
                ) : actions.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap tabular-nums">{timeAgo(a.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                          <span className="text-purple-700 text-xs font-semibold">{a.admin_name?.[0]?.toUpperCase()}</span>
                        </div>
                        <span className="text-gray-700 text-xs font-medium">{a.admin_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {a.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {a.target_type && a.target_id ? `${a.target_type} #${a.target_id}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs max-w-xs truncate">{a.details ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {expandUA && <UAModal ua={expandUA} onClose={() => setExpandUA(null)} />}
    </Layout>
  )
}
