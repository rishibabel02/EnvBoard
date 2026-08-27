import { get, post, patch } from './client'

export const listUsers         = ()              => get('/admin/users')
export const createUser        = (data)          => post('/admin/users', data)
export const updateUserRole    = (id, role)      => patch(`/admin/users/${id}/role`, { role })
export const setUserActive     = (id, is_active) => patch(`/admin/users/${id}/status`, { is_active })
export const resetPassword     = (id, new_password) => post(`/admin/users/${id}/reset-password`, { new_password })
export const listLogs          = (limit = 50, offset = 0) => get(`/admin/logs?limit=${limit}&offset=${offset}`)
export const listAdminActions  = (limit = 50, offset = 0) => get(`/admin/actions?limit=${limit}&offset=${offset}`)
