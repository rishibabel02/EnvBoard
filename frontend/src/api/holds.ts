import { post, patch, del } from './client'
import type { Hold } from '../types'

interface HoldResponse { data: Hold }
interface MessageResponse { message: string }

export const claimEnvironment = (environment_id: number, purpose: string, duration_minutes: number) =>
  post<HoldResponse>('/holds', { environment_id, purpose, duration_minutes })

export const extendHold = (id: number, add_minutes: number) =>
  patch<HoldResponse>(`/holds/${id}/extend`, { add_minutes })

export const releaseHold = (id: number) =>
  del<MessageResponse>(`/holds/${id}/release`)

export const reclaimHold = (id: number, reason: string) =>
  post<MessageResponse>(`/holds/${id}/reclaim`, { reason })
