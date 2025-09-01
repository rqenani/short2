import React, { useEffect, useState } from 'react'
import api, { setAuth } from '../api'
import { QRCodeCanvas } from 'qrcode.react'

function useAuthSetup(){
  useEffect(()=>{
    const t = localStorage.getItem('token')
    if(t) setAuth(t)
  },[])
}

export default function Admin(){
  useAuthSetup()
  const [links, setLinks] = useState([])
  const [ads, setAds] = useState({ enabled:false, html:'', seconds:0 })
  const [host, setHost] = useState('')
  const [loading, setLoading] = useState(true)

  async function load(){
    setLoading(true)
    const [l,a] = await Promise.all([
      api.get('/api/links'),
      api.get('/api/config/ads')
    ])
    setLinks(l.data)
    setAds(a.data || { enabled:false, html:'', seconds:0 })
    setLoading(false)
  }

  useEffect(()=>{ load() }, [])

  async function saveAds(e){
    e.preventDefault()
    const { data } = await api.post('/api/config/ads', ads)
    setAds(data)
    alert('U ruajt')
  }
  async function addDomain(e){
    e.preventDefault()
    if(!host) return
    await api.post('/api/domains', { host })
    setHost('')
    alert('Domain u shtua')
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold">Admin Portal</h2>

      {loading ? <div className="mt-6 text-slate-400">Duke ngarkuar…</div> : (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <section className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-semibold">📋 Linket e fundit</h3>
            <div className="mt-3 space-y-3 max-h-[420px] overflow-auto pr-2">
              {links.map(l => (
                <div key={l.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <div className="text-sm text-slate-400">{new Date(l.createdAt).toLocaleString()}</div>
                  <div className="font-semibold">{window.location.origin}/{l.slug}</div>
                  <div className="text-xs break-words text-slate-400">{l.longUrl}</div>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">Klikime: {l.clicks}</span>
                    <a className="underline" href={`/${l.slug}`} target="_blank">Hap</a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-semibold">📢 Reklama (Interstitial)</h3>
            <form onSubmit={saveAds} className="grid gap-3 mt-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!ads.enabled} onChange={e=>setAds(a=>({...a, enabled: e.target.checked}))} />
                <span>Aktivo</span>
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-slate-400">Sekonda para redirect</span>
                <input type="number" value={ads.seconds} onChange={e=>setAds(a=>({...a, seconds: Number(e.target.value)}))} className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800"/>
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-slate-400">HTML i reklamës</span>
                <textarea value={ads.html || ''} onChange={e=>setAds(a=>({...a, html: e.target.value}))} rows={6} className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800"></textarea>
              </label>
              <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">Ruaj</button>
            </form>
          </section>

          <section className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-semibold">🌐 Domain-e</h3>
            <form onSubmit={addDomain} className="mt-3 flex gap-2">
              <input value={host} onChange={e=>setHost(e.target.value)} placeholder="p.sh. short.al" className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800"/>
              <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">Shto</button>
            </form>
            <p className="text-xs text-slate-400 mt-2">Shënim: Domain-et e shtuar këtu janë vetëm për konfigurim logjik. DNS/CNAME bëhet te provider-i i domain-it.</p>
          </section>

          <section className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-semibold">ℹ️ Udhëzim i shpejtë</h3>
            <ol className="list-decimal list-inside text-slate-300 text-sm mt-2 space-y-1">
              <li>Vendos <code>DATABASE_URL</code>, <code>JWT_SECRET</code>, <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD</code>, <code>BASE_URL</code>, <code>INTERSTITIAL_SECONDS</code>.</li>
              <li>Deploy në Railway. Ky shërbim i vetëm mban backend + frontend statik.</li>
              <li>Shko te <code>/admin</code>, futu me kredencialet e tua.</li>
              <li>Shkruaj linkun në faqe kryesore, merr <strong>short.al/slug</strong>.</li>
              <li>Nëse aktivon reklamë, vizitorët shohin interstitial me countdown para redirect.</li>
            </ol>
          </section>
        </div>
      )}
    </main>
  )
}
