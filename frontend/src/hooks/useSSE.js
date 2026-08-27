import { useState, useEffect, useRef, useCallback } from 'react'

export function useSSE(url) {
  const [data, setData]           = useState(null)
  const [connected, setConnected] = useState(false)
  const esRef    = useRef(null)
  const retryRef = useRef(null)

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

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data)
        setData(parsed.data ?? parsed)
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
      clearTimeout(retryRef.current)
      esRef.current?.close()
    }
  }, [connect])

  // Close and immediately reconnect — server sends current state on connect
  const refresh = useCallback(() => {
    clearTimeout(retryRef.current)
    connect()
  }, [connect])

  return { data, connected, refresh }
}
