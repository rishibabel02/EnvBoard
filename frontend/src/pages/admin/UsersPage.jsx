import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { listUsers, createUser, updateUserRole, setUserActive, resetPassword } from '../../api/admin'

export default function UsersPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState({ name: '', email: '', password: '', role: 'member' })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [pwModal, setPwModal] = useState(null)
  const [newPw,   setNewPw]   = useState('')

  function load() {
    listUsers().then(r => setUsers(r.data ?? [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true); setError('')
    try { await createUser(form); setModal(null); load() }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleRoleToggle(user) {
    const next = user.role === 'admin' ? 'member' : 'admin'
    try { await updateUserRole(user.id, next); load() }
    catch (err) { alert(err.message) }
  }

  async function handleActiveToggle(user) {
    try { await setUserActive(user.id, !user.is_active); load() }
    catch (err) { alert(err.message) }
  }

  async function handleResetPassword(e) {
    e.preventDefault(); setSaving(true); setError('')
    try { await resetPassword(pwModal.id, newPw); setPwModal(null); setNewPw('') }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

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
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => handleRoleToggle(u)} className="text-xs text-gray-400 hover:text-purple-600 transition-colors">
                        {u.role === 'admin' ? 'Make Member' : 'Make Admin'}
                      </button>
                      <button onClick={() => handleActiveToggle(u)} className={`text-xs transition-colors ${u.is_active ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-emerald-600'}`}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => { setPwModal(u); setNewPw(''); setError('') }} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
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

      {/* Create modal */}
      {modal && (
        <ModalWrapper title="New User" onClose={() => setModal(null)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {[['Name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password']].map(([label, field, type]) => (
              <Field key={field} label={label} type={type} value={form[field]} onChange={v => setForm(f => ({ ...f, [field]: v }))} />
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <ModalFooter onClose={() => setModal(null)} saving={saving} label="Create User" />
          </form>
        </ModalWrapper>
      )}

      {/* Reset password modal */}
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

function ModalWrapper({ title, onClose, children }) {
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

function Field({ label, type, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  )
}

function ModalFooter({ onClose, saving, label }) {
  return (
    <div className="flex gap-3 pt-1">
      <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
      <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
        {saving ? 'Saving…' : label}
      </button>
    </div>
  )
}
