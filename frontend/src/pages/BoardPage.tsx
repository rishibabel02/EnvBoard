import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import EnvironmentCard from '../components/EnvironmentCard'
import ClaimModal   from '../components/modals/ClaimModal'
import ExtendModal  from '../components/modals/ExtendModal'
import ReclaimModal from '../components/modals/ReclaimModal'
import { useSSE }  from '../hooks/useSSE'
import { useAuth } from '../hooks/useAuth'
import { releaseHold } from '../api/holds'
import type { BoardEntry } from '../types'

interface Toast {
  kind:        'reclaim' | 'expiry_warning' | 'env_deactivated'
  envName:     string
  reason?:     string
  adminName?:  string
  minutesLeft?: number
}

interface NotifData {
  type:         string
  env_name:     string
  reason?:      string
  admin_name?:  string
  minutes_left?: number
}

export default function BoardPage() {
  const { user }          = useAuth()
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEvent = useCallback((msg: { type: string; data: unknown }) => {
    if (msg.type === 'notification') {
      const d = msg.data as NotifData
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setToast({
        kind:        d.type as Toast['kind'],
        envName:     d.env_name,
        reason:      d.reason,
        adminName:   d.admin_name,
        minutesLeft: d.minutes_left,
      })
      toastTimer.current = setTimeout(() => setToast(null), 5000)
    }
  }, [])

  const { data: board, connected, refresh } = useSSE<BoardEntry[]>('/api/board/stream', handleEvent)
  const navigate                            = useNavigate()
  const [refreshing,  setRefreshing]  = useState(false)
  const [claimEnv,    setClaimEnv]    = useState<BoardEntry | null>(null)
  const [extendEnv,   setExtendEnv]   = useState<BoardEntry | null>(null)
  const [reclaimEnv,  setReclaimEnv]  = useState<BoardEntry | null>(null)

  async function handleRelease(env: BoardEntry) {
    if (!env.hold) return
    try {
      await releaseHold(env.hold.id)
      refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    }
  }

  function handleRefresh() {
    setRefreshing(true)
    refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  const envs = board ?? []

  return (
    <Layout>
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-start gap-3 bg-white shadow-lg rounded-2xl px-4 py-3 max-w-sm border ${
          toast.kind === 'reclaim' || toast.kind === 'env_deactivated' ? 'border-red-200' : 'border-amber-200'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            toast.kind === 'reclaim' || toast.kind === 'env_deactivated' ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            {toast.kind === 'expiry_warning' ? (
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {toast.kind === 'reclaim' && (
              <>
                <p className="text-sm font-semibold text-gray-900">Hold force-released</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-700">{toast.envName}</span> was reclaimed
                  {toast.adminName && <> by <span className="font-medium text-purple-700">{toast.adminName}</span></>}
                </p>
                {toast.reason && <p className="text-xs text-gray-400 mt-0.5 italic">"{toast.reason}"</p>}
              </>
            )}
            {toast.kind === 'env_deactivated' && (
              <>
                <p className="text-sm font-semibold text-gray-900">Environment deactivated</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-700">{toast.envName}</span> was deactivated
                  {toast.adminName && <> by <span className="font-medium text-purple-700">{toast.adminName}</span></>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Your hold has been released.</p>
              </>
            )}
            {toast.kind === 'expiry_warning' && (
              <>
                <p className="text-sm font-semibold text-gray-900">Hold expiring soon</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-700">{toast.envName}</span> expires in {toast.minutesLeft} min
                </p>
              </>
            )}
          </div>
          <button onClick={() => setToast(null)} className="text-gray-300 hover:text-gray-500 text-sm leading-none mt-0.5">✕</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Environments</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {envs.filter(e => e.status === 'available').length} available · {envs.filter(e => e.status === 'in_use').length} in use
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-400">{connected ? 'Live' : 'Reconnecting…'}</span>
          </div>
        </div>
      </div>

      {envs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <span className="text-2xl">🖥</span>
          </div>
          <p className="text-sm">No environments yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {envs.map(env => (
            <EnvironmentCard key={env.id} env={env} currentUser={user}
              onClaim={setClaimEnv}
              onExtend={setExtendEnv}
              onRelease={handleRelease}
              onReclaim={setReclaimEnv}
              onHistory={env => navigate(`/environments/${env.id}/history`, { state: { name: env.name } })}
            />
          ))}
        </div>
      )}

      {claimEnv && (
        <ClaimModal env={claimEnv} onClose={() => setClaimEnv(null)}
          onSuccess={() => { setClaimEnv(null); refresh() }} />
      )}
      {extendEnv && (
        <ExtendModal env={extendEnv} onClose={() => setExtendEnv(null)}
          onSuccess={() => { setExtendEnv(null); refresh() }} />
      )}
      {reclaimEnv && (
        <ReclaimModal env={reclaimEnv} onClose={() => setReclaimEnv(null)}
          onSuccess={() => { setReclaimEnv(null); refresh() }}
          isOwner={reclaimEnv.hold?.holder?.id === user?.id} />
      )}
    </Layout>
  )
}
