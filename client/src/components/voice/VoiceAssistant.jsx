import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { ArrowUp, Mic, MicOff, Square, Volume2, X } from 'lucide-react'
import { api } from '../../services/api'

const quickCommands = {
  hi: ['पार्किंग उपलब्ध है?', 'स्लॉट बुक करो', 'कितनी जगह है?'],
  en: ['Available slots?', "Today's revenue?", 'System status?']
}

export default function VoiceAssistant() {
  const [open, setOpen] = useState(false)
  const [language, setLanguage] = useState('en')
  const [listening, setListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [synthesisSupported, setSynthesisSupported] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [input, setInput] = useState('')
  const [chat, setChat] = useState([])
  const recognitionRef = useRef(null)
  const isStoppingRef = useRef(false)
  const voicesRef = useRef([])
  const voicesLoadedRef = useRef(false)
  const bars = useMemo(() => Array.from({ length: 20 }, (_, i) => i), [])

  
  const loadVoices = useCallback(() => {
    if (voicesLoadedRef.current) return
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      voicesRef.current = voices
      voicesLoadedRef.current = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechSupported(!!SpeechRecognition)

    if (typeof window.speechSynthesis !== 'undefined') {
      setSynthesisSupported(true)

  
      window.speechSynthesis.onvoiceschanged = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          voicesRef.current = voices
          voicesLoadedRef.current = true
        }
      }

      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        voicesRef.current = voices
        voicesLoadedRef.current = true
      }
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [])

  
  useEffect(() => {
    if (open && typeof window !== 'undefined' && window.speechSynthesis) {
      loadVoices()
    }
  }, [open, loadVoices])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US'

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      transcript = transcript.trim()
      if (transcript) {
        setInput('')
        ask(transcript)
      }
    }

    recognition.onerror = (event) => {
      setListening(false)
      if (event.error === 'aborted' && isStoppingRef.current) {
        isStoppingRef.current = false
        return
      }
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
        addMsg('assistant', language === 'hi' ? 'माइक्रोफोन उपलब्ध नहीं है।' : 'Microphone not available.')
        return
      }
      if (event.error === 'network') {
        addMsg('assistant', language === 'hi'
          ? 'वॉइस पहचान के लिए इंटरनेट चाहिए। कृपया टाइप करके पूछें।'
          : 'Voice recognition requires internet. Try typing instead.')
        return
      }
      if (event.error === 'no-speech') {
        addMsg('assistant', language === 'hi' ? 'कोई आवाज़ नहीं मिली।' : 'No speech detected.')
        return
      }
      addMsg('assistant', language === 'hi' ? 'वॉइस पहचान में समस्या आई।' : 'Voice recognition error.')
    }

    recognition.onend = () => {
      isStoppingRef.current = false
      setListening(false)
    }

    recognitionRef.current = recognition
  }, [language])

  function addMsg(role, text, extra = {}) {
    setChat((prev) =>
      [{ id: crypto.randomUUID(), role, text, ...extra }, ...prev].slice(0, 8)
    )
  }

  function speakText(text, lang) {
    if (!synthesisSupported || !text) return

    window.speechSynthesis.cancel()

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text)
      const targetLang = lang === 'hi' ? 'hi-IN' : 'en-US'

      const voices = voicesRef.current
      const matched =
        voices.find((v) => v.lang === targetLang) ||
        voices.find((v) => v.lang.startsWith(lang === 'hi' ? 'hi' : 'en')) ||
        null

      if (matched) utterance.voice = matched
      utterance.lang = targetLang
      utterance.rate = lang === 'hi' ? 0.85 : 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      let keepAlive = null

      utterance.onstart = () => {
        setSpeaking(true)
        keepAlive = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(keepAlive)
            return
          }
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }, 10000)
      }

      utterance.onend = () => {
        if (keepAlive) clearInterval(keepAlive)
        setSpeaking(false)
      }

      utterance.onerror = (e) => {
        if (keepAlive) clearInterval(keepAlive)
        if (e.error !== 'interrupted') console.warn('[TTS]', e.error)
        setSpeaking(false)
      }

      window.speechSynthesis.speak(utterance)
    }, 100)
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  async function ask(query) {
    if (!query.trim()) return

    loadVoices()

    addMsg('user', query)

    try {
      const response = await api.post('/voice/query', { text: query, language })
      const data = response.data.data
      const replyText = data.response
      const replyLang = data.language || language

      addMsg('assistant', replyText, { language: replyLang })

      setTimeout(() => speakText(replyText, replyLang), 50)
    } catch (_err) {
      addMsg('assistant', language === 'hi' ? 'सर्वर से जवाब नहीं मिला।' : 'Could not reach voice service.')
    }
  }

  function submit() {
    const q = input.trim()
    setInput('')
    ask(q)
  }

  function toggleListening() {
    if (!speechSupported || !recognitionRef.current) {
      addMsg('assistant', language === 'hi'
        ? 'इस ब्राउज़र में वॉइस सपोर्ट नहीं है।'
        : 'Voice input not supported in this browser.')
      return
    }

    if (listening) {
      isStoppingRef.current = true
      recognitionRef.current.stop()
      setListening(false)
      return
    }

    if (!navigator.onLine) {
      addMsg('assistant', language === 'hi'
        ? 'इंटरनेट नहीं है। कृपया टाइप करके पूछें।'
        : 'No internet. Please type your question.')
      return
    }

    try {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-US'
      recognitionRef.current.start()
      setListening(true)
    } catch (_err) {
      setListening(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="glass-card mb-3 w-[320px] translate-y-0 border border-brand-cyan/30 p-3 shadow-2xl shadow-brand-cyan/15 transition-transform duration-300">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-orbitron text-sm text-brand-cyan">🎙️ SmartPark Voice AI</h4>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10">
              <X size={16} />
            </button>
          </div>

          <div className="mb-2 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`rounded px-2 py-1 ${language === 'hi' ? 'bg-brand-cyan text-dark-base' : 'bg-dark-surface text-slate-300'}`}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`rounded px-2 py-1 ${language === 'en' ? 'bg-brand-cyan text-dark-base' : 'bg-dark-surface text-slate-300'}`}
            >
              English
            </button>
          </div>

          <button
            type="button"
            onClick={toggleListening}
            className={`mb-2 w-full rounded-lg border px-2 py-2 text-left transition ${
              listening ? 'border-brand-cyan/60 bg-brand-cyan/10' : 'border-dark-border bg-dark-surface'
            }`}
          >
            <div className="flex h-20 items-end justify-center gap-1 overflow-hidden">
              {bars.map((bar) => (
                <span
                  key={bar}
                  className={`w-[3px] rounded ${listening ? 'bg-red-500' : 'bg-brand-cyan'}`}
                  style={{
                    height: listening ? `${12 + (bar % 5) * 4}px` : `${4 + (bar % 3) * 2}px`,
                    transition: 'height 180ms ease',
                    animation: listening
                      ? `voiceWave ${1.2 + (bar % 6) * 0.08}s ease-in-out infinite`
                      : 'none',
                    animationDelay: listening ? `${bar * 0.04}s` : '0s'
                  }}
                />
              ))}
            </div>
            <p className="mt-1 text-center text-xs text-slate-400">
              {listening ? 'Listening...' : speechSupported ? 'Tap to speak' : 'Voice not supported'}
            </p>
          </button>

          <div className="mb-2 grid grid-cols-2 gap-1">
            {quickCommands[language].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => ask(cmd)}
                className="rounded-full border border-brand-cyan/25 bg-brand-cyan/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-brand-cyan/15"
              >
                {cmd}
              </button>
            ))}
          </div>

          <div className="mb-2 max-h-48 space-y-2 overflow-y-auto pr-1">
            {chat.slice(0, 4).map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`relative max-w-[85%] rounded-lg px-2.5 py-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-dark-surface text-slate-100'
                      : 'border border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.role === 'assistant' && speaking && msg.id === chat[0]?.id && (
                    <span className="absolute -left-1 -top-1 animate-pulse text-brand-cyan">
                      <Volume2 size={12} />
                    </span>
                  )}
                  {msg.role === 'assistant' && msg.intent === 'BOOKING' && (
                    <button
                      type="button"
                      className="mt-1 rounded bg-brand-cyan/20 px-2 py-1 text-[10px] text-brand-cyan"
                    >
                      🗺️ Map देखें →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`rounded-lg p-2 ${
                  listening
                    ? 'animate-pulse bg-red-500/20 text-red-500'
                    : 'bg-brand-cyan/20 text-brand-cyan'
                }`}
                title={listening ? 'Stop listening' : 'Start listening'}
              >
                {listening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="Type your query..."
              className="flex-1 rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-xs outline-none focus:border-brand-cyan"
            />
            <button
              type="button"
              onClick={submit}
              className="rounded-lg bg-brand-cyan/20 p-2 text-brand-cyan"
            >
              <ArrowUp size={14} />
            </button>
          </div>

          {speaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
            >
              <Square size={10} fill="currentColor" />
              Stop Speaking
            </button>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="SmartPark Voice AI"
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan to-brand-violet text-white shadow-xl shadow-brand-cyan/40"
      >
        <span className="absolute inset-0 animate-pulse rounded-full border border-brand-cyan/70" />
        <Mic size={24} />
        <span className="absolute -right-1 -top-1 rounded-full bg-brand-cyan px-1.5 py-0.5 text-[10px] font-bold text-dark-base">
          AI
        </span>
      </button>
    </div>
  )
}