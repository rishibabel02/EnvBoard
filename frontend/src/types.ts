export interface AuthUser {
  id: number
  name: string
  email: string
  role: 'member' | 'admin'
}

export interface User {
  id: number
  name: string
  email: string
  role: 'member' | 'admin'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Environment {
  id: number
  name: string
  description: string
  console_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Hold {
  id: number
  environment_id: number
  user_id: number
  purpose: string
  started_at: string
  expires_at: string
  released_at: string | null
  status: 'active' | 'released' | 'expired' | 'reclaimed'
}

export interface HolderInfo {
  id: number
  name: string
}

export interface BoardHoldInfo {
  id: number
  holder: HolderInfo
  purpose: string
  started_at: string
  expires_at: string
  seconds_remaining: number
}

export interface BoardEntry {
  id: number
  name: string
  description: string
  console_url: string
  status: 'available' | 'in_use' | 'unavailable'
  hold: BoardHoldInfo | null
}

export interface HistoryItem {
  id: number
  environment_id: number
  user_id: number
  user_name: string
  actor_id: number | null
  actor_name: string
  hold_id: number | null
  action: 'claimed' | 'extended' | 'released' | 'expired' | 'reclaimed'
  reason: string | null
  created_at: string
}

export interface HistoryPage {
  entries: HistoryItem[]
  total: number
  limit: number
  offset: number
}

export interface AdminLog {
  id: number
  user_id: number | null
  user_name: string | null
  event: string
  ip_address: string | null
  user_agent: string | null
  details: string | null
  created_at: string
}

export interface AdminAction {
  id: number
  admin_id: number
  admin_name: string
  action: string
  target_type: string | null
  target_id: number | null
  details: string | null
  created_at: string
}

export interface AuditItem {
  id: number
  environment_id: number
  environment_name: string
  hold_id: number | null
  user_id: number
  user_name: string
  actor_id: number | null
  actor_name: string
  action: string
  reason: string | null
  created_at: string
}

export class ApiError extends Error {
  code: string
  status: number
  data: unknown

  constructor(message: string, code: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.data = data
  }
}
