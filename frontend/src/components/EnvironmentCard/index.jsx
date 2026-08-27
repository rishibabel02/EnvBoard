import Countdown from './Countdown'

const STATUS = {
  available:   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700',  label: 'Available'   },
  in_use:      { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700',      label: 'In Use'      },
  unavailable: { dot: 'bg-gray-300',    badge: 'bg-gray-100 text-gray-500',       label: 'Unavailable' },
}

export default function EnvironmentCard({ env, currentUser, onClaim, onExtend, onRelease, onReclaim, onHistory }) {
  const s      = STATUS[env.status] ?? STATUS.unavailable
  const isOwner = env.hold?.holder?.id === currentUser?.id
  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Card header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base truncate">{env.name}</h3>
            {env.description && (
              <p className="text-sm text-gray-400 mt-0.5 truncate">{env.description}</p>
            )}
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${s.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>
      </div>

      {/* Hold info */}
      {env.status === 'in_use' && env.hold && (
        <div className="px-5 pb-3 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-indigo-700 text-xs font-semibold">
                {env.hold.holder?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 leading-none">{env.hold.holder?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{env.hold.purpose}</p>
            </div>
          </div>
          <Countdown
            expiresAt={env.hold.expires_at}
            initialSeconds={env.hold.seconds_remaining}
          />
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between gap-2">
        <button
          onClick={() => onHistory(env)}
          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
        >
          History
        </button>

        <div className="flex items-center gap-2">
          {env.status === 'available' && (
            <Btn primary onClick={() => onClaim(env)}>Claim</Btn>
          )}
          {env.status === 'in_use' && isOwner && (
            <>
              <Btn onClick={() => onExtend(env)}>Extend</Btn>
              <Btn danger onClick={() => onRelease(env)}>Release</Btn>
            </>
          )}
          {env.status === 'in_use' && isAdmin && !isOwner && (
            <Btn danger onClick={() => onReclaim(env)}>Reclaim</Btn>
          )}
          {env.status === 'in_use' && isAdmin && isOwner && (
            <Btn danger onClick={() => onReclaim(env)}>Reclaim</Btn>
          )}
          {env.status === 'unavailable' && (
            <span className="text-xs text-gray-300">Inactive</span>
          )}
        </div>
      </div>
    </div>
  )
}

function Btn({ children, onClick, primary, danger }) {
  const base = 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors'
  const style = primary
    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
    : danger
    ? 'bg-red-50 text-red-600 hover:bg-red-100'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  return <button onClick={onClick} className={`${base} ${style}`}>{children}</button>
}
