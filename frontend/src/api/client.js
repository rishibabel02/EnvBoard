const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

export async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Something went wrong')
    err.code = data?.error?.code || 'UNKNOWN'
    err.status = res.status
    throw err
  }

  return data
}

export const get  = (path)        => request('GET',    path)
export const post = (path, body)  => request('POST',   path, body)
export const patch = (path, body) => request('PATCH',  path, body)
export const del  = (path)        => request('DELETE', path)
