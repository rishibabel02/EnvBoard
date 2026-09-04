import { ApiError } from '../types'

const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(
      data?.error?.message ?? data?.message ?? 'Something went wrong',
      data?.error?.code ?? data?.code ?? 'UNKNOWN',
      res.status,
      data,
    )
  }

  return data as T
}

export const get  = <T>(path: string)                    => request<T>('GET',    path)
export const post = <T>(path: string, body?: unknown)    => request<T>('POST',   path, body)
export const patch = <T>(path: string, body?: unknown)   => request<T>('PATCH',  path, body)
export const del  = <T>(path: string)                    => request<T>('DELETE', path)
