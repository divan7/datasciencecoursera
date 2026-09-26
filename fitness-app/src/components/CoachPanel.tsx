import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Lightbulb, CheckSquare, X } from 'lucide-react'
import type { CoachNote, WeeklyInsight } from '../data/coachNotes'

// ─── Coach note (phase / workout explanation) ────────────────────────────────

interface CoachNoteCardProps {
  note: CoachNote
  defaultOpen?: boolean
  onClose?: () => void
}

export function CoachNoteCard({ note, defaultOpen = false, onClose }: CoachNoteCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [expandedSection, setExpandedSection] = useState<number | null>(0)

  return (
    <div className="bg-zinc-900 border border-violet-400/25 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-violet-400/15 flex items-center justify-center shrink-0">
          <BookOpen size={15} className="text-violet-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Coach técnico</p>
          <p className="text-white text-sm font-medium mt-0.5">{note.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onClose && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onClose() }}
              className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          {open ? <ChevronUp size={15} className="text-zinc-500" /> : <ChevronDown size={15} className="text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-5 py-4 space-y-2">
          {note.sections.map((section, i) => (
            <div key={i} className="border border-zinc-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-medium text-zinc-200">{section.heading}</span>
                {expandedSection === i
                  ? <ChevronUp size={13} className="text-zinc-500 shrink-0" />
                  : <ChevronDown size={13} className="text-zinc-500 shrink-0" />}
              </button>
              {expandedSection === i && (
                <div className="px-4 pb-4 space-y-2">
                  <p className="text-sm text-zinc-400 leading-relaxed">{section.body}</p>
                  {section.source && (
                    <p className="text-xs text-violet-400/70 flex items-center gap-1.5">
                      <BookOpen size={10} />
                      Fuente: {section.source}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Weekly insight card ─────────────────────────────────────────────────────

interface WeeklyInsightCardProps {
  insight: WeeklyInsight
  onDismiss?: () => void
}

export function WeeklyInsightCard({ insight, onDismiss }: WeeklyInsightCardProps) {
  const [open, setOpen] = useState(true)

  if (!open) return null

  return (
    <div className="bg-gradient-to-br from-cyan-400/8 to-violet-400/5 border border-cyan-400/25 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-3">
        <div className="w-9 h-9 rounded-xl bg-cyan-400/15 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb size={17} className="text-cyan-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Insight semanal</p>
          <h3 className="text-white font-semibold mt-0.5 text-sm">{insight.title}</h3>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={() => { setOpen(false); onDismiss() }}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 pb-4">
        <p className="text-sm text-zinc-400 leading-relaxed">{insight.body}</p>

        {insight.actionItems.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckSquare size={12} className="text-cyan-400" />
              <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Esta semana, enfócate en:</p>
            </div>
            <ul className="space-y-1.5">
              {insight.actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                  <span className="text-cyan-400 shrink-0 font-bold">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Inline coach tip (compact, for workout view) ────────────────────────────

interface CoachTipProps {
  text: string
  source?: string
}

export function CoachTip({ text, source }: CoachTipProps) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-violet-400/8 border border-violet-400/20 rounded-xl">
      <Lightbulb size={14} className="text-violet-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-zinc-300 leading-snug">{text}</p>
        {source && <p className="text-xs text-violet-400/60 mt-1">{source}</p>}
      </div>
    </div>
  )
}
