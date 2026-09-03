import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { listLogs, listAdminActions, listAudit } from '../../api/admin'
import type { AdminLog, AdminAction, AuditItem } from '../../types'

// ── Unified shape ────────────────────────────────────────────────────────────
interface UnifiedLog {
  key:         string
  source:      'system' | 'admin' | 'audit'
  created_at:  string
  who:         string | null
  actor:       string | null
  action:      string
  environment: string | null
  detail:      string | null
  user_agent:  string | null
}

function fromLog(l: AdminLog): UnifiedLog {
  return {
    key:         `sys-${l.id}`,
    source:      'system',
    created_at:  l.created_at,
    who:         l.user_name,
    actor:       null,
    action:      l.event,
    environment: null,
    detail:      l.ip_address,
    user_agent:  l.user_agent,
  }
}

function fromAction(a: AdminAction): UnifiedLog {
  const target = a.target_type && a.target_id ? `${a.target_type} #${a.target_id}` : null
  return {
    key:         `adm-${a.id}`,
    source:      'admin',
    created_at:  a.created_at,
    who:         a.admin_name,
    actor:       null,
    action:      a.action,
    environment: null,
    detail:      target ?? a.details,
    user_agent:  null,
  }
}

function fromAudit(item: AuditItem): UnifiedLog {
  return {
    key:         `aud-${item.id}`,
    source:      'audit',
    created_at:  item.created_at,
    who:         item.user_name,
    actor:       item.actor_name && item.actor_name !== item.user_name ? item.actor_name : null,
    action:      item.action,
    environment: item.environment_name,
    detail:      item.reason,
    user_agent:  null,
  }
}

// ── Styles ───────────────────────────────────────────────────────────────────
const SOURCE_STYLE: Record<string, string> = {
  system: 'bg-slate-100 text-slate-600',
  admin:  'bg-purple-50 text-purple-700',
  audit:  'bg-indigo-50 text-indigo-700',
}

const ACTION_STYLE: Record<string, string> = {
  login_success:  'bg-emerald-50 text-emerald-700',
  login_failed:   'bg-red-50 text-red-600',
  hold_claimed:   'bg-blue-50 text-blue-700',
  hold_extended:  'bg-indigo-50 text-indigo-700',
  hold_released:  'bg-gray-100 text-gray-600',
  hold_reclaimed: 'bg-orange-50 text-orange-700',
  claimed:        'bg-emerald-50 text-emerald-700',
  extended:       'bg-blue-50 text-blue-700',
  released:       'bg-gray-100 text-gray-600',
  expired:        'bg-orange-50 text-orange-700',
  reclaimed:      'bg-red-50 text-red-600',
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)    return `${Math.floor(diff)}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── UAModal ──────────────────────────────────────────────────────────────────
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

const PAGE_SIZE = 50

const SOURCE_ACTIONS: Record<string, { label: string; value: string }[]> = {
  '': [
    { label: 'login success',  value: 'login_success'  },
    { label: 'login failed',   value: 'login_failed'   },
    { label: 'hold claimed',   value: 'hold_claimed'   },
    { label: 'hold extended',  value: 'hold_extended'  },
    { label: 'hold released',  value: 'hold_released'  },
    { label: 'hold reclaimed', value: 'hold_reclaimed' },
    { label: 'claimed',        value: 'claimed'        },
    { label: 'extended',       value: 'extended'       },
    { label: 'released',       value: 'released'       },
    { label: 'expired',        value: 'expired'        },
    { label: 'reclaimed',      value: 'reclaimed'      },
  ],
  system: [
    { label: 'login success',  value: 'login_success'  },
    { label: 'login failed',   value: 'login_failed'   },
    { label: 'hold claimed',   value: 'hold_claimed'   },
    { label: 'hold extended',  value: 'hold_extended'  },
    { label: 'hold released',  value: 'hold_released'  },
    { label: 'hold reclaimed', value: 'hold_reclaimed' },
  ],
  admin: [],
  audit: [
    { label: 'claimed',   value: 'claimed'   },
    { label: 'extended',  value: 'extended'  },
    { label: 'released',  value: 'released'  },
    { label: 'expired',   value: 'expired'   },
    { label: 'reclaimed', value: 'reclaimed' },
  ],
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LogsPage() {
  const [rows,      setRows]      = useState<UnifiedLog[]>([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandUA,  setExpandUA]  = useState<string | null>(null)
  const [page,      setPage]      = useState(0)

  // filters
  const [fSource, setFSource] = useState('')
  const [fAction, setFAction] = useState('')
  const [fFrom,   setFFrom]   = useState('')
  const [fTo,     setFTo]     = useState('')
  const [fName,   setFName]   = useState('')

  const hasFilters = fSource || fAction || fFrom || fTo || fName

  const filtered = rows.filter(r => {
    if (fSource && r.source !== fSource) return false
    if (fAction && r.action !== fAction) return false
    if (fFrom   && new Date(r.created_at) < new Date(fFrom)) return false
    if (fTo     && new Date(r.created_at) > new Date(fTo))   return false
    if (fName) {
      const q = fName.toLowerCase()
      const whoMatch   = r.who?.toLowerCase().includes(q)   ?? false
      const actorMatch = r.actor?.toLowerCase().includes(q) ?? false
      if (!whoMatch && !actorMatch) return false
    }
    return true
  })

  // reset action when source changes (selected action may not exist in new source)
  useEffect(() => { setFAction('') }, [fSource])

  // reset to page 0 whenever filters change
  useEffect(() => { setPage(0) }, [fSource, fAction, fFrom, fTo, fName])

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const paged       = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function clearFilters() {
    setFSource(''); setFAction(''); setFFrom(''); setFTo(''); setFName('')
  }

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    Promise.all([
      listLogs(200, 0),
      listAdminActions(200, 0),
      listAudit({ limit: 500, offset: 0 }),
    ]).then(([l, a, au]) => {
      const merged: UnifiedLog[] = [
        ...(l.data  ?? []).map(fromLog),
        ...(a.data  ?? []).map(fromAction),
        ...(au.data?.items ?? []).map(fromAudit),
      ]
      merged.sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())
      setRows(merged)
    }).finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { load() }, [])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Logs</h1>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
          <select value={fSource} onChange={e => setFSource(e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All sources</option>
            <option value="system">System</option>
            <option value="admin">Admin</option>
            <option value="audit">Audit</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input type="text" value={fName} onChange={e => setFName(e.target.value)} placeholder="Search by name…"
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
          <select value={fAction} onChange={e => setFAction(e.target.value)}
            disabled={SOURCE_ACTIONS[fSource]?.length === 0}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed">
            <option value="">All actions</option>
            {(SOURCE_ACTIONS[fSource] ?? SOURCE_ACTIONS['']).map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="datetime-local" value={fFrom} max={fTo || undefined}
            onChange={e => setFFrom(e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="datetime-local" value={fTo} min={fFrom || undefined}
            onChange={e => setFTo(e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        {hasFilters && (
          <button onClick={clearFilters}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors self-end">
            Clear
          </button>
        )}
      </div>

      {loading ? <p className="text-sm text-gray-400 py-12 text-center">Loading…</p> : (
        <>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 text-xs text-gray-400">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}{hasFilters ? ` (${rows.length} total)` : ''}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['When', 'Source', 'Who', 'Action', 'Environment', 'Detail'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                  {hasFilters ? 'No entries match your filters' : 'No logs yet'}
                </td></tr>
              ) : paged.map(row => (
                <tr key={row.key} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-gray-400 tabular-nums whitespace-nowrap">{timeAgo(row.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${SOURCE_STYLE[row.source]}`}>
                      {row.source}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {row.who ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-700 text-xs font-medium">{row.who}</span>
                        {row.actor && <span className="text-purple-600 text-xs">via {row.actor}</span>}
                      </div>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_STYLE[row.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {row.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {row.environment ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs max-w-xs truncate"
                    style={{ cursor: row.user_agent ? 'pointer' : 'default' }}
                    onClick={() => row.user_agent && setExpandUA(row.user_agent)}
                    title={row.user_agent ? 'Click to view full user agent' : undefined}>
                    {row.detail ?? (row.user_agent ? <span className="text-indigo-500 hover:underline">UA</span> : <span className="text-gray-300">—</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 text-sm text-gray-500">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors text-xs">
              ← Previous
            </button>
            <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors text-xs">
              Next →
            </button>
          </div>
        )}
        </>
      )}
      {expandUA && <UAModal ua={expandUA} onClose={() => setExpandUA(null)} />}
    </Layout>
  )
}
