import { post, patch, del } from './client'

export const claimEnvironment = (environment_id, purpose, duration_minutes) =>
  post('/holds', { environment_id, purpose, duration_minutes })

export const extendHold = (id, add_minutes) =>
  patch(`/holds/${id}/extend`, { add_minutes })

export const releaseHold = (id) =>
  del(`/holds/${id}/release`)

export const reclaimHold = (id, reason) =>
  post(`/holds/${id}/reclaim`, { reason })
