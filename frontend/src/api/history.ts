import { get } from './client'
import type { HistoryPage } from '../types'

interface HistoryResponse { data: HistoryPage }

export interface HistoryFilters {
  action?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export const listHistory = (envId: string | number, filters: HistoryFilters = {}) => {
  const params = new URLSearchParams()
  if (filters.limit)  params.set('limit',  String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))
  if (filters.action) params.set('action', filters.action)
  if (filters.from)   params.set('from',   filters.from)
  if (filters.to)     params.set('to',     filters.to)
  const qs = params.toString()
  return get<HistoryResponse>(`/environments/${envId}/history${qs ? `?${qs}` : ''}`)
}
