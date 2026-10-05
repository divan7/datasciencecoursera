import { useCallback, useRef } from 'react'

export type AudioMode = 'off' | 'guide' | 'coach'

export function useWorkoutSpeech() {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  function getVoice(): SpeechSynthesisVoice | null {
    if (voiceRef.current) return voiceRef.current
    const voices = window.speechSynthesis.getVoices()
    const es = voices.find(v => v.lang.startsWith('es') && v.localService)
      ?? voices.find(v => v.lang.startsWith('es'))
      ?? null
    voiceRef.current = es
    return es
  }

  function makeUtterance(text: string, rate = 0.92): SpeechSynthesisUtterance {
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'es-ES'
    utt.rate = rate
    utt.pitch = 1.0
    utt.volume = 1.0
    const voice = getVoice()
    if (voice) utt.voice = voice
    return utt
  }

  const speak = useCallback((text: string) => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(makeUtterance(text))
  }, [isSupported]) // eslint-disable-line react-hooks/exhaustive-deps

  const speakSequence = useCallback((texts: string[]) => {
    if (!isSupported || texts.length === 0) return
    window.speechSynthesis.cancel()
    texts.forEach((text, i) => {
      window.speechSynthesis.speak(makeUtterance(text, i === 0 ? 0.92 : 0.88))
    })
  }, [isSupported]) // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel()
  }, [isSupported])

  return { speak, speakSequence, stop, isSupported }
}
