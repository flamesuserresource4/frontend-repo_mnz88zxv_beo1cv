import React, { useEffect, useMemo, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'

export default function ChatUI() {
  const [status, setStatus] = useState('disconnected') // disconnected | searching | matched
  const [roomId, setRoomId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [partnerTyping, setPartnerTyping] = useState(false)
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  const backendUrl = useMemo(() => {
    const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
    // For websockets, convert http->ws and https->wss
    try {
      const url = new URL(base)
      const wsProto = url.protocol === 'https:' ? 'wss:' : 'ws:'
      url.protocol = wsProto
      url.pathname = '/ws'
      return url.toString()
    } catch {
      return 'ws://localhost:8000/ws'
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, partnerTyping])

  const connect = () => {
    if (wsRef.current && (wsRef.current.readyState === 0 || wsRef.current.readyState === 1)) return
    const ws = new WebSocket(backendUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('searching')
    }

    ws.onmessage = (event) => {
      let data
      try { data = JSON.parse(event.data) } catch { data = { type: 'chat', text: event.data } }
      const { type } = data
      if (type === 'searching') {
        setStatus('searching')
      } else if (type === 'matched') {
        setStatus('matched')
        setRoomId(data.roomId)
        setPartnerTyping(false)
        setMessages([])
      } else if (type === 'chat') {
        setMessages(prev => [...prev, { from: 'partner', text: data.text }])
        setPartnerTyping(false)
      } else if (type === 'typing') {
        setPartnerTyping(true)
        // hide after a while
        setTimeout(() => setPartnerTyping(false), 1200)
      } else if (type === 'partner_disconnect') {
        setStatus('searching')
        setRoomId(null)
        setPartnerTyping(false)
        setMessages(prev => [...prev, { from: 'system', text: 'Partner disconnected. Searching for a new match...' }])
      } else if (type === 'system') {
        setMessages(prev => [...prev, { from: 'system', text: data.text }])
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      setTimeout(connect, 1000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: 'chat', text }))
    setMessages(prev => [...prev, { from: 'me', text }])
    setInput('')
  }

  const sendTyping = () => {
    if (!wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: 'typing' }))
  }

  const nextPartner = () => {
    if (!wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: 'next' }))
    setMessages(prev => [...prev, { from: 'system', text: 'Finding someone new...' }])
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-6 py-4 border-b border-slate-200/20 bg-slate-900/30 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-semibold text-lg">AnonChat</h1>
            <p className="text-xs text-slate-300/70">Chat with a random stranger. No accounts. No history.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${status === 'matched' ? 'bg-emerald-600/20 text-emerald-300' : status === 'searching' ? 'bg-amber-600/20 text-amber-300' : 'bg-rose-600/20 text-rose-300'}`}>{status}</span>
            <button onClick={nextPartner} className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm">Next</button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 relative">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 min-h-[60vh]">
            <div className="text-center text-slate-300 text-sm mb-4">
              {status === 'searching' && 'Searching for a partner...'}
              {status === 'matched' && roomId && `You are connected. Room ${roomId.slice(0,8)}...`}
              {status === 'disconnected' && 'Disconnected. Reconnecting...'}
            </div>

            <div className="space-y-1">
              {messages.map((m, idx) => (
                <MessageBubble key={idx} text={m.text} from={m.from} />
              ))}
              {partnerTyping && (
                <div className="w-full flex justify-start mb-2">
                  <div className="bg-slate-200 text-slate-900 max-w-[75%] px-4 py-2 rounded-2xl rounded-bl-sm shadow text-sm italic opacity-80">
                    typing...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/20 bg-slate-900/30 backdrop-blur p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
            onInput={sendTyping}
            placeholder={status === 'matched' ? 'Say hi!' : 'Waiting for a partner...'}
            disabled={status !== 'matched'}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white placeholder:text-slate-400 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
          />
          <button onClick={sendMessage} disabled={status !== 'matched'} className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50">Send</button>
        </div>
      </footer>
    </div>
  )
}
