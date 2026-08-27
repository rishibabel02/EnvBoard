import { get } from './client'

export const listHistory = (envId, limit = 20, offset = 0) =>
  get(`/environments/${envId}/history?limit=${limit}&offset=${offset}`)
