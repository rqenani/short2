import React, { useState } from 'react'
import Shortener from './components/Shortener.jsx'
import Admin from './pages/Admin.jsx'
import Login from './pages/Login.jsx'

export default function App(){
  const [route, setRoute] = useState(window.location.pathname.startsWith('/admin') ? 'admin' : 'home')

  React.useEffect(() => {
    const onPop = () => {
      setRoute(window.location.pathname.startsWith('/admin') ? 'admin' : 'home')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function go(r){
    window.history.pushState({}, '', r === 'admin' ? '/admin' : '/')
    setRoute(r)
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur bg-slate-900/70 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500" />
            <span className="font-bold text-xl tracking-tight">short.al</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">beta</span>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <button className="px-3 py-1.5 rounded-lg hover:bg-slate-800" onClick={()=>go('home')}>Kreu</button>
            <button className="px-3 py-1.5 rounded-lg hover:bg-slate-800" onClick={()=>go('admin')}>Admin</button>
          </nav>
        </div>
      </header>

      {route === 'home' && <Shortener />}
      {route === 'admin' && (localStorage.getItem('token') ? <Admin /> : <Login onLogin={()=>setRoute('admin')} />)}

      <footer className="border-t border-slate-800 py-10 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-sm text-slate-400">
          © 2025 short.al • <a className="underline" href="mailto:rqenani@gmail.com">Kontakt</a>
        </div>
      </footer>
    </div>
  )
}
