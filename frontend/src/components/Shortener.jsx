import React, { useState } from 'react'
import api from '../api'
import { QRCodeCanvas } from 'qrcode.react'

export default function Shortener(){
  const [domains, setDomains] = useState([])
  const [domain, setDomain] = useState('')
  React.useEffect(()=>{ (async()=>{ try{ const {data}=await api.get('/api/domains/public'); setDomains(data||[]); }catch(e){} })() },[])
  const [url, setUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function onShorten(e){
    e.preventDefault()
    if(!url) return
    setLoading(true)
    try {
      const payload = { url, slug: slug || undefined }
      if(domain) payload.domain = domain
      const { data } = await api.post('/api/shorten', payload)
      setResult(data)
    } catch (e) {
      alert(e.response?.data?.error || 'Gabim')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4">
      <section className="py-16 text-center">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Shkurtoje linkun tënd, <span className="text-blue-400">thjeshtë</span> dhe <span className="text-indigo-400">shpejt</span>.</h1>
        <p className="mt-3 text-slate-400">URL shortener me analitika dhe admin portal. Falas për nisje.</p>

        <form onSubmit={onShorten} className="mt-8 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-center">
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500"/>
          {domains.length>0 && (
            <select value={domain} onChange={e=>setDomain(e.target.value)} className="w-full md:w-56 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800">
              <option value="">(domain i faqes)</option>
              {domains.map(d=> <option key={d.id} value={d.host}>{d.host}</option>)}
            </select>
          )}
          <input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="slug (opsional)" className="w-full md:w-48 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 outline-none focus:border-blue-500"/>
          <button disabled={loading} className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60">{loading ? 'Duke shkurtuar…' : 'Shkurtoje'}</button>
        </form>

        {result && (
          <div className="mt-8 mx-auto max-w-xl p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-slate-400 text-sm">Link i shkurtuar</div>
                <a className="text-lg font-semibold underline" href={result.shortUrl} target="_blank" rel="noreferrer">{result.shortUrl}</a>
              </div>
              <button onClick={()=>navigator.clipboard.writeText(result.shortUrl)} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700">Kopjo</button>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <QRCodeCanvas value={result.shortUrl} size={96} />
              <div className="text-slate-400 text-sm">Skano QR për të hapur linkun.</div>
            </div>
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="font-semibold">⚡ I shpejtë</h3>
          <p className="text-slate-400 text-sm mt-2">Shkurto linkun me një klik. Redirect i menjëhershëm.</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="font-semibold">📊 Analitika</h3>
          <p className="text-slate-400 text-sm mt-2">Shiko klikimet sipas datës në panelin e adminit.</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="font-semibold">🔒 Siguri</h3>
          <p className="text-slate-400 text-sm mt-2">JWT për adminin, validim slug/URL, log i klikimeve.</p>
        </div>
      </section>
    </main>
  )
}
