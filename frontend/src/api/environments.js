import { get, post, patch } from './client'

export const listEnvironments  = ()              => get('/environments')
export const createEnvironment = (data)          => post('/environments', data)
export const updateEnvironment = (id, data)      => patch(`/environments/${id}`, data)
export const setEnvActive      = (id, is_active) => patch(`/environments/${id}/status`, { is_active })
