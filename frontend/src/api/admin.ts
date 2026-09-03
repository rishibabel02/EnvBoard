import { get, post, patch } from './client'
import type { User, AdminLog, AdminAction, AuditItem } from '../types'

interface UsersResponse  { data: User[] }
interface UserResponse   { data: User }
interface LogsResponse   { data: AdminLog[] }
interface ActionsResponse { data: AdminAction[] }
interface MessageResponse { message: string }

export interface AuditPage {
  items:  AuditItem[]
  total:  number
  limit:  number
  offset: number
}
interface AuditResponse { data: AuditPage }

export interface AuditFilters {
  action?:        string
  environment_id?: number
  user_id?:       number
  from?:          string
  to?:            string
  limit?:         number
  offset?:        number
}

export const listAudit = (filters: AuditFilters = {}) => {
  const params = new URLSearchParams()
  if (filters.action)         params.set('action',         filters.action)
  if (filters.environment_id) params.set('environment_id', String(filters.environment_id))
  if (filters.user_id)        params.set('user_id',        String(filters.user_id))
  if (filters.from)           params.set('from',           filters.from)
  if (filters.to)             params.set('to',             filters.to)
  if (filters.limit)          params.set('limit',          String(filters.limit))
  if (filters.offset)         params.set('offset',         String(filters.offset))
  const qs = params.toString()
  return get<AuditResponse>(`/admin/audit${qs ? `?${qs}` : ''}`)
}

export const listUsers        = ()                                     => get<UsersResponse>('/admin/users')
export const createUser       = (data: { name: string; email: string; password: string; role: string }) =>
  post<UserResponse>('/admin/users', data)
export const updateUserRole   = (id: number, role: string)             => patch<UserResponse>(`/admin/users/${id}/role`, { role })
export const setUserActive    = (id: number, is_active: boolean)       => patch<UserResponse>(`/admin/users/${id}/status`, { is_active })
export const resetPassword    = (id: number, new_password: string)     => post<MessageResponse>(`/admin/users/${id}/reset-password`, { new_password })
export const listLogs         = (limit = 50, offset = 0)               => get<LogsResponse>(`/admin/logs?limit=${limit}&offset=${offset}`)
export const listAdminActions = (limit = 50, offset = 0)               => get<ActionsResponse>(`/admin/actions?limit=${limit}&offset=${offset}`)
