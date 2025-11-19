import React from 'react'

export default function MessageBubble({ text, from }) {
  const mine = from === 'me'
  return (
    <div className={`w-full flex ${mine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`${mine ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-900'} max-w-[75%] px-4 py-2 rounded-2xl ${mine ? 'rounded-br-sm' : 'rounded-bl-sm'} shadow`}
        style={{wordBreak:'break-word'}}>
        {text}
      </div>
    </div>
  )
}
