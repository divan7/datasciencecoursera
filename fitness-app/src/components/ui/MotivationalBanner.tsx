import { useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { selectMotivationalPhrase } from '../../data/motivational'
import type { MotivationalContext } from '../../data/motivational'

interface Props {
  context: MotivationalContext
  dismissible?: boolean
  compact?: boolean
}

export default function MotivationalBanner({ context, dismissible = false, compact = false }: Props) {
  const [phrase, setPhrase] = useState(() => selectMotivationalPhrase(context))
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  function refresh() {
    setPhrase(selectMotivationalPhrase(context))
  }

  if (compact) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
        <span className="text-xl shrink-0">{phrase.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-300 leading-snug italic">"{phrase.text}"</p>
          {phrase.author && (
            <p className="text-xs text-zinc-600 mt-1">— {phrase.author}</p>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
          title="Otra frase"
        >
          <RefreshCw size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-br from-zinc-900 to-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <X size={14} />
        </button>
      )}
      <div className="flex items-start gap-4 pr-6">
        <span className="text-3xl shrink-0">{phrase.emoji}</span>
        <div>
          <p className="text-white leading-relaxed italic">"{phrase.text}"</p>
          {phrase.author && (
            <p className="text-xs text-zinc-500 mt-2">— {phrase.author}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={refresh}
        className="mt-3 flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <RefreshCw size={11} />
        Otra frase
      </button>
    </div>
  )
}
