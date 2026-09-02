import { useState, useEffect, useRef, useCallback } from 'react'

interface UseSSEResult<T> {
  data: T | null
  connected: boolean
  refresh: () => void
}

export function useSSE<T>(url: string): UseSSEResult<T> {
  const [data, setData]           = useState<T | null>(null)
  const [connected, setConnected] = useState(false)
  const esRef    = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const es = new EventSource(`${url}?token=${token}`)
    esRef.current = es

    es.onopen = () => setConnected(true)

    es.onmessage = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data as string) as { data?: T }
        setData(parsed.data ?? (parsed as unknown as T))
      } catch (_) {}
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      retryRef.current = setTimeout(connect, 3000)
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      esRef.current?.close()
    }
  }, [connect])

  const refresh = useCallback(() => {
    if (retryRef.current) clearTimeout(retryRef.current)
    connect()
  }, [connect])

  return { data, connected, refresh }
}
