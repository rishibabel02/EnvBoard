import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import { listLogs, listAdminActions, listAudit } from '../../api/admin'
import type { AuditFilters, AuditPage } from '../../api/admin'
import type { AdminLog, AdminAction, AuditItem } from '../../types'

function UAModal({ ua, onClose }: { ua: string; onClose: () => void }) {
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

const EVENT_STYLE: Record<string, string> = {
  login_success:  'bg-emerald-50 text-emerald-700',
  login_failed:   'bg-red-50 text-red-600',
  hold_claimed:   'bg-blue-50 text-blue-700',
  hold_extended:  'bg-indigo-50 text-indigo-700',
  hold_released:  'bg-gray-100 text-gray-600',
  hold_reclaimed: 'bg-orange-50 text-orange-700',
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)    return `${Math.floor(diff)}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

const AUDIT_ACTIONS = ['claimed', 'extended', 'released', 'expired', 'reclaimed']
const AUDIT_LIMIT   = 50

const AUDIT_ACTION_STYLES: Record<string, string> = {
  claimed:   'bg-emerald-50 text-emerald-700',
  extended:  'bg-blue-50 text-blue-700',
  released:  'bg-gray-100 text-gray-600',
  expired:   'bg-orange-50 text-orange-700',
  reclaimed: 'bg-red-50 text-red-600',
}

function AuditTab() {
  const [page,    setPage]    = useState<AuditPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [offset,  setOffset]  = useState(0)

  const [action,  setAction]  = useState('')
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')

  const [applied, setApplied] = useState<AuditFilters>({})

  const load = useCallback((off: number, filters: AuditFilters) => {
    setLoading(true)
    setError('')
    listAudit({ ...filters, limit: AUDIT_LIMIT, offset: off })
      .then(r => setPage(r.data))
      .catch(e => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(0, {}) }, [load])

  function handleApply(e: React.FormEvent) {
    e.preventDefault()
    const f: AuditFilters = {
      action: action || undefined,
      from:   from   || undefined,
      to:     to     || undefined,
    }
    setApplied(f)
    setOffset(0)
    load(0, f)
  }

  function handleClear() {
    setAction(''); setFrom(''); setTo('')
    setApplied({})
    setOffset(0)
    load(0, {})
  }

  const hasFilters = action || from || to
  const total      = page?.total ?? 0
  const totalPages = Math.ceil(total / AUDIT_LIMIT)
  const currentPage = Math.floor(offset / AUDIT_LIMIT) + 1
  const items: AuditItem[] = page?.items ?? []

  return (
    <>
      {/* Filter bar */}
      <form onSubmit={handleApply} className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
          <select value={action} onChange={e => setAction(e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="datetime-local" value={from}
            onChange={e => setFrom(e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="datetime-local" value={to}
            onChange={e => setTo(e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {hasFilters && (
            <button type="button" onClick={handleClear}
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

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-500">{error}</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 text-xs text-gray-400">
              {total} {total === 1 ? 'entry' : 'entries'}{hasFilters ? ' matching filters' : ''}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['When', 'Environment', 'Action', 'Holder', 'Actor', 'Reason'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                    {hasFilters ? 'No results match your filters' : 'No audit entries yet'}
                  </td></tr>
                ) : items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-gray-400 tabular-nums whitespace-nowrap">{timeAgo(item.created_at)}</td>
                    <td className="px-5 py-3.5 text-gray-700 text-xs font-medium">{item.environment_name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${AUDIT_ACTION_STYLES[item.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        {item.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {item.user_name ? <MiniChip name={item.user_name} color="indigo" /> : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {item.actor_name && item.actor_name !== item.user_name
                        ? <MiniChip name={item.actor_name} color="purple" />
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{item.reason ?? <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <button onClick={() => { const o = Math.max(0, offset - AUDIT_LIMIT); setOffset(o); load(o, applied) }}
                disabled={offset === 0}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                ← Previous
              </button>
              <span className="text-gray-400">Page {currentPage} of {totalPages}</span>
              <button onClick={() => { const o = offset + AUDIT_LIMIT; setOffset(o); load(o, applied) }}
                disabled={offset + AUDIT_LIMIT >= total}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}

export default function LogsPage() {
  const [tab,       setTab]       = useState<'logs' | 'actions' | 'audit'>('logs')
  const [logs,      setLogs]      = useState<AdminLog[]>([])
  const [actions,   setActions]   = useState<AdminAction[]>([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandUA,  setExpandUA]  = useState<string | null>(null)

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
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['logs', 'actions', 'audit'] as const).map(value => (
            <button key={value} onClick={() => setTab(value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {value === 'logs' ? 'System Logs' : value === 'actions' ? 'Admin Actions' : 'Audit'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'audit' ? <AuditTab /> : loading ? <p className="text-sm text-gray-400 py-12 text-center">Loading…</p> : (
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
                    <td className="px-5 py-3.5 text-gray-400 text-xs max-w-xs truncate hover:text-indigo-600 transition-colors"
                      style={{ cursor: l.user_agent ? 'pointer' : 'default' }}
                      onClick={() => l.user_agent && setExpandUA(l.user_agent)}
                      title={l.user_agent ? 'Click to view full user agent' : undefined}>
                      {l.user_agent ?? '—'}
                    </td>
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
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{a.action}</span>
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

function MiniChip({ name, color }: { name: string; color: 'indigo' | 'purple' }) {
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
