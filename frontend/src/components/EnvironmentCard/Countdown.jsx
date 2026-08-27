import { useState, useEffect } from 'react'

export default function Countdown({ expiresAt, initialSeconds }) {
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    setSeconds(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (seconds <= 0) return
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [seconds])

  const total  = new Date(expiresAt) - new Date(expiresAt.replace(/T.*/, 'T00:00:00'))
  const pct    = Math.max(0, Math.min(100, (seconds / (initialSeconds || 1)) * 100))
  const urgent = seconds < 900  // < 15 min
  const warn   = seconds < 1800 // < 30 min

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  const timeStr = h > 0
    ? `${h}h ${m}m`
    : m > 0
    ? `${m}m ${s}s`
    : `${s}s`

  const barColor = urgent ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-emerald-500'
  const textColor = urgent ? 'text-red-600' : warn ? 'text-amber-600' : 'text-gray-500'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">Expires in</span>
        <span className={`text-xs font-semibold tabular-nums ${textColor}`}>{timeStr}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
