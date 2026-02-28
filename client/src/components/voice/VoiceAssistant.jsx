import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Mic, MicOff, X } from 'lucide-react'
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
  const [input, setInput] = useState('')
  const [chat, setChat] = useState([])
  const recognitionRef = useRef(null)
  const isStoppingRef = useRef(false)
  const bars = useMemo(() => Array.from({ length: 20 }, (_, i) => i), [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }

    setSpeechSupported(true)
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US'

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += transcript
        else interimText += transcript
      }

      const transcript = (finalText || interimText).trim()
      if (transcript) setInput(transcript)
      if (finalText.trim()) {
        const query = finalText.trim()
        setInput('')
        ask(query)
      }
    }

    recognition.onerror = (event) => {
      setListening(false)
      if (event.error === 'aborted' && isStoppingRef.current) {
        isStoppingRef.current = false
        return
      }

      const map = {
        'not-allowed': language === 'hi' ? 'माइक अनुमति दें।' : 'Please allow microphone access.',
        'service-not-allowed': language === 'hi' ? 'ब्राउज़र में वॉइस सेवा ब्लॉक है।' : 'Speech service is blocked by browser settings.',
        'no-speech': language === 'hi' ? 'कोई आवाज़ नहीं मिली।' : 'No speech detected.',
        'audio-capture': language === 'hi' ? 'माइक डिवाइस नहीं मिला।' : 'No microphone device detected.',
        network: language === 'hi' ? 'नेटवर्क समस्या के कारण वॉइस प्रोसेस नहीं हुआ।' : 'Voice processing failed due to a network issue.',
        aborted: language === 'hi' ? 'वॉइस सत्र रुक गया। फिर से कोशिश करें।' : 'Voice session was interrupted. Please try again.',
        default: language === 'hi' ? 'वॉइस पहचान में समस्या आई।' : 'Voice recognition error occurred.'
      }
      const errorText = map[event.error] || map.default
      setChat((prev) => [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: errorText
        },
        ...prev
      ].slice(0, 8))
    }

    recognition.onend = () => {
      isStoppingRef.current = false
      setListening(false)
    }

    recognitionRef.current = recognition
    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [language])

  async function ask(query) {
    if (!query.trim()) return
    const userMessage = { id: crypto.randomUUID(), role: 'user', text: query }
    setChat((prev) => [userMessage, ...prev].slice(0, 8))

    setListening(true)
    setTimeout(() => setListening(false), 1500)

    try {
      const response = await api.post('/voice/query', { text: query, language })
      const data = response.data.data
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: data.response,
        intent: data.intent
      }
      setChat((prev) => [assistantMessage, ...prev].slice(0, 8))
    } catch (_error) {
      setChat((prev) => [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: language === 'hi' ? 'सर्वर से जवाब नहीं मिला।' : 'Could not reach voice service.'
        },
        ...prev
      ].slice(0, 8))
    }
  }

  function submit() {
    const q = input.trim()
    setInput('')
    ask(q)
  }

  function toggleListening() {
    if (!speechSupported || !recognitionRef.current) {
      setChat((prev) => [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: language === 'hi' ? 'इस ब्राउज़र में वॉइस सपोर्ट नहीं है।' : 'Voice input is not supported in this browser.'
        },
        ...prev
      ].slice(0, 8))
      return
    }

    if (listening) {
      isStoppingRef.current = true
      recognitionRef.current.stop()
      setListening(false)
      return
    }

    try {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-US'
      recognitionRef.current.start()
      setListening(true)
    } catch (_error) {
      setListening(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="glass-card mb-3 w-[320px] translate-y-0 border border-brand-cyan/30 p-3 shadow-2xl shadow-brand-cyan/15 transition-transform duration-300">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-orbitron text-sm text-brand-cyan">🎙️ SmartPark Voice AI</h4>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10"><X size={16} /></button>
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
                  className="w-[3px] rounded bg-brand-cyan"
                  style={{
                    height: listening ? `${12 + (bar % 5) * 4}px` : `${4 + (bar % 3) * 2}px`,
                    transition: 'height 180ms ease',
                    animation: `voiceWave ${1.2 + (bar % 6) * 0.08}s ease-in-out infinite`,
                    animationDelay: `${bar * 0.04}s`
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
                  className={`max-w-[85%] rounded-lg px-2.5 py-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-dark-surface text-slate-100'
                      : 'border border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.role === 'assistant' && msg.intent === 'BOOKING' ? (
                    <button type="button" className="mt-1 rounded bg-brand-cyan/20 px-2 py-1 text-[10px] text-brand-cyan">🗺️ Map देखें →</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`rounded-lg p-2 ${listening ? 'bg-brand-red/20 text-brand-red' : 'bg-brand-cyan/20 text-brand-cyan'}`}
              title={listening ? 'Stop listening' : 'Start listening'}
            >
              {listening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              placeholder="Type your query..."
              className="flex-1 rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-xs outline-none focus:border-brand-cyan"
            />
            <button type="button" onClick={submit} className="rounded-lg bg-brand-cyan/20 p-2 text-brand-cyan"><ArrowUp size={14} /></button>
          </div>
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
        <span className="absolute -right-1 -top-1 rounded-full bg-brand-cyan px-1.5 py-0.5 text-[10px] font-bold text-dark-base">AI</span>
      </button>
    </div>
  )
}
