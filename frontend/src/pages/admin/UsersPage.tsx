import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { listUsers, createUser, updateUserRole, setUserActive, resetPassword } from '../../api/admin'
import type { User } from '../../types'

interface UserForm { name: string; email: string; password: string; role: 'member' | 'admin' }

export default function UsersPage() {
  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState<UserForm>({ name: '', email: '', password: '', role: 'member' })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [pwModal, setPwModal] = useState<User | null>(null)
  const [newPw,   setNewPw]   = useState('')

  function load() {
    listUsers().then(r => setUsers(r.data ?? [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try { await createUser(form); setModal(false); load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Error') }
    finally { setSaving(false) }
  }

  async function handleRoleToggle(user: User) {
    const next = user.role === 'admin' ? 'member' : 'admin'
    try { await updateUserRole(user.id, next); load() }
    catch (err) { alert(err instanceof Error ? err.message : 'Error') }
  }

  async function handleActiveToggle(user: User) {
    try { await setUserActive(user.id, !user.is_active); load() }
    catch (err) { alert(err instanceof Error ? err.message : 'Error') }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pwModal) return
    setSaving(true); setError('')
    try { await resetPassword(pwModal.id, newPw); setPwModal(null); setNewPw('') }
    catch (err) { setError(err instanceof Error ? err.message : 'Error') }
    finally { setSaving(false) }
  }

  const userFormFields: Array<[string, keyof UserForm, string]> = [
    ['Name', 'name', 'text'],
    ['Email', 'email', 'email'],
    ['Password', 'password', 'password'],
  ]

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <button onClick={() => { setForm({ name: '', email: '', password: '', role: 'member' }); setModal(true); setError('') }}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
          + New User
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-400 py-12 text-center">Loading…</p> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Name', 'Email', 'Role', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-indigo-700 text-xs font-semibold">{u.name?.[0]?.toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => handleRoleToggle(u)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${u.role === 'admin' ? 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100' : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>
                        {u.role === 'admin' ? 'Make Member' : 'Make Admin'}
                      </button>
                      <button onClick={() => handleActiveToggle(u)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${u.is_active ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => { setPwModal(u); setNewPw(''); setError('') }}
                        className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors">
                        Reset PW
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ModalWrapper title="New User" onClose={() => setModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {userFormFields.map(([label, field, type]) => (
              <Field key={field} label={label} type={type} value={form[field]}
                onChange={v => setForm(f => ({ ...f, [field]: v }))} />
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'member' | 'admin' }))}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <ModalFooter onClose={() => setModal(false)} saving={saving} label="Create User" />
          </form>
        </ModalWrapper>
      )}

      {pwModal && (
        <ModalWrapper title={`Reset Password — ${pwModal.name}`} onClose={() => setPwModal(null)}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Field label="New Password" type="password" value={newPw} onChange={setNewPw} />
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <ModalFooter onClose={() => setPwModal(null)} saving={saving} label="Update Password" />
          </form>
        </ModalWrapper>
      )}
    </Layout>
  )
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  )
}

function ModalFooter({ onClose, saving, label }: { onClose: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex gap-3 pt-1">
      <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
      <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
        {saving ? 'Saving…' : label}
      </button>
    </div>
  )
}
