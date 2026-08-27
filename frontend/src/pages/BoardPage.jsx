import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import EnvironmentCard from '../components/EnvironmentCard'
import ClaimModal   from '../components/modals/ClaimModal'
import ExtendModal  from '../components/modals/ExtendModal'
import ReclaimModal from '../components/modals/ReclaimModal'
import { useSSE }  from '../hooks/useSSE'
import { useAuth } from '../hooks/useAuth'
import { releaseHold } from '../api/holds'

export default function BoardPage() {
  const { user }                         = useAuth()
  const { data: board, connected, refresh } = useSSE('/api/board/stream')
  const navigate                         = useNavigate()
  const [refreshing, setRefreshing]      = useState(false)

  const [claimEnv,   setClaimEnv]   = useState(null)
  const [extendEnv,  setExtendEnv]  = useState(null)
  const [reclaimEnv, setReclaimEnv] = useState(null)

  async function handleRelease(env) {
    try {
      await releaseHold(env.hold.id)
      refresh()
    } catch (err) {
      alert(err.message)
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Environments</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {envs.filter(e => e.status === 'available').length} available · {envs.filter(e => e.status === 'in_use').length} in use
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh board"
          >
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
            <EnvironmentCard
              key={env.id}
              env={env}
              currentUser={user}
              onClaim={setClaimEnv}
              onExtend={setExtendEnv}
              onRelease={handleRelease}
              onReclaim={setReclaimEnv}
              onHistory={env => navigate(`/environments/${env.id}/history`)}
            />
          ))}
        </div>
      )}

      {claimEnv && (
        <ClaimModal
          env={claimEnv}
          onClose={() => setClaimEnv(null)}
          onSuccess={() => { setClaimEnv(null); refresh() }}
        />
      )}
      {extendEnv && (
        <ExtendModal
          env={extendEnv}
          onClose={() => setExtendEnv(null)}
          onSuccess={() => { setExtendEnv(null); refresh() }}
        />
      )}
      {reclaimEnv && (
        <ReclaimModal
          env={reclaimEnv}
          onClose={() => setReclaimEnv(null)}
          onSuccess={() => { setReclaimEnv(null); refresh() }}
          isOwner={reclaimEnv.hold?.holder?.id === user?.id}
        />
      )}
    </Layout>
  )
}
