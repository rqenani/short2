import React, { useState } from 'react'
import api, { setAuth } from '../api'

export default function Login({ onLogin }){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e){
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      setAuth(data.token)
      onLogin?.()
    } catch (e) {
      alert(e.response?.data?.error || 'Gabim')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold">Hyrje Admin</h2>
      <form onSubmit={submit} className="mt-6 grid gap-3">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500"/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Fjalëkalimi" className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500"/>
        <button disabled={loading} className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60">{loading ? 'Duke u futur…' : 'Hyr'}</button>
      </form>
    </main>
  )
}
