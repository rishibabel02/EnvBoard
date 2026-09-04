import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { listEnvironments, createEnvironment, updateEnvironment, setEnvActive, deleteEnvironment } from '../../api/environments'
import { ApiError } from '../../types'
import type { Environment } from '../../types'

interface EnvForm { name: string; description: string; console_url: string }

interface HoldConflict { env: Environment; holderName: string; purpose: string }

export default function EnvironmentsPage() {
  const [envs,     setEnvs]     = useState<Environment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<null | 'create' | Environment>(null)
  const [form,     setForm]     = useState<EnvForm>({ name: '', description: '', console_url: '' })
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [conflict, setConflict] = useState<HoldConflict | null>(null)

  function load() {
    listEnvironments()
      .then(r => setEnvs(r.data ?? []))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  function openCreate() { setForm({ name: '', description: '', console_url: '' }); setModal('create'); setError('') }
  function openEdit(env: Environment) { setForm({ name: env.name, description: env.description, console_url: env.console_url }); setModal(env); setError('') }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      if (modal === 'create') await createEnvironment(form)
      else if (modal && typeof modal !== 'string') await updateEnvironment(modal.id, form)
      setModal(null); load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Error') }
    finally { setSaving(false) }
  }

  async function toggleActive(env: Environment) {
    try {
      await setEnvActive(env.id, !env.is_active)
      load()
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'HAS_ACTIVE_HOLD') {
        const d = err.data as { holder?: { name: string; purpose: string } }
        if (d?.holder) {
          setConflict({ env, holderName: d.holder.name, purpose: d.holder.purpose })
          return
        }
      }
      alert(err instanceof Error ? err.message : 'Error')
    }
  }

  async function forceDeactivate() {
    if (!conflict) return
    try {
      await setEnvActive(conflict.env.id, false, true)
      setConflict(null)
      load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
  }

  async function handleDelete(env: Environment) {
    if (!confirm(`Delete "${env.name}"? This cannot be undone.`)) return
    try { await deleteEnvironment(env.id); load() }
    catch (err) { alert(err instanceof Error ? err.message : 'Error') }
  }

  const fields: Array<[string, keyof EnvForm, string]> = [
    ['Name *', 'name', 'text'],
    ['Description', 'description', 'text'],
    ['Console URL', 'console_url', 'url'],
  ]

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Environments</h1>
        <button onClick={openCreate}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
          + New Environment
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-400 py-12 text-center">Loading…</p> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Name', 'Description', 'Console URL', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {envs.map(env => (
                <tr key={env.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{env.name}</td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">{env.description || <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3.5 text-gray-400 max-w-xs truncate">
                    {env.console_url
                      ? <a href={env.console_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{env.console_url}</a>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${env.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${env.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {env.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(env)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-xs font-medium hover:bg-gray-100 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => toggleActive(env)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${env.is_active ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        {env.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleDelete(env)}
                        className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {modal === 'create' ? 'New Environment' : `Edit ${typeof modal !== 'string' && modal ? modal.name : ''}`}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {fields.map(([label, field, type]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input type={type} value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConflict(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Environment In Use</h2>
              <button onClick={() => setConflict(null)} className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{conflict.env.name}</span> is currently held by{' '}
                <span className="font-semibold text-indigo-700">{conflict.holderName}</span>
                {conflict.purpose && <> for <span className="italic text-gray-500">"{conflict.purpose}"</span></>}.
              </p>
              <p className="text-sm text-gray-500">Deactivating will force-release their hold and notify them. Continue?</p>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setConflict(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={forceDeactivate} className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700">
                  Deactivate Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
