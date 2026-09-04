import { get, post, patch, del } from './client'
import type { Environment } from '../types'

interface EnvsResponse { data: Environment[] }
interface EnvResponse  { data: Environment }

export const listEnvironments  = ()                                               => get<EnvsResponse>('/environments')
export const createEnvironment = (data: { name: string; description: string; console_url: string }) =>
  post<EnvResponse>('/environments', data)
export const updateEnvironment = (id: number, data: { name: string; description: string; console_url: string }) =>
  patch<EnvResponse>(`/environments/${id}`, data)
export const setEnvActive      = (id: number, is_active: boolean, force = false)  => patch<EnvResponse>(`/environments/${id}/status`, { is_active, force })
export const deleteEnvironment = (id: number)                                      => del<{ message: string }>(`/environments/${id}`)
