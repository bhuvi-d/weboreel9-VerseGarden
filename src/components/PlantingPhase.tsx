'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFlower, FlowerInstance } from '@/lib/flowers';
import Flower from './Flower';
import { useAudio } from './AudioEngine';
import { Mic, Keyboard, Leaf, ArrowRight, MicOff } from 'lucide-react';

const AFFIRMATIONS = [
  "I believe in the future",
  "I am at rest and peace",
  "I am worthy of love",
  "I am brave and strong",
  "I am thankful for life",
  "I can fly higher"
];

const FloatingPetal = ({ x, y, color }: { x: number, y: number, color: string }) => (
  <motion.div
    initial={{ x: `${x}%`, y: `${y}%`, opacity: 1, scale: 0 }}
    animate={{ x: `${x + (Math.random() * 20 - 10)}%`, y: `${y - 20}%`, opacity: 0, scale: 1, rotate: 360 }}
    transition={{ duration: 2, ease: "easeOut" }}
    className="absolute pointer-events-none"
    style={{ color }}
  >
    <Leaf size={16} fill="currentColor" />
  </motion.div>
);

export default function PlantingPhase({ onComplete }: { onComplete: (flowers: FlowerInstance[]) => void }) {
  const [phase, setPhase] = useState<'deciding' | 'active'>('deciding');
  const [mode, setMode] = useState<'voice' | 'keyboard'>('keyboard');
  const [timeLeft, setTimeLeft] = useState(45);
  const [flowers, setFlowers] = useState<FlowerInstance[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const [isBlooming, setIsBlooming] = useState(false);
  const [bursts, setBursts] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [voiceBlocked, setVoiceBlocked] = useState(false);

  const { playChime } = useAudio();

  const lastSowRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const playChimeRef = useRef(playChime);
  useEffect(() => { playChimeRef.current = playChime; }, [playChime]);

  // Sow ONLY from actual spoken text — no random fallback
  const sowFlower = useCallback((spokenText: string) => {
    const now = Date.now();
    if (now - lastSowRef.current < 1500) return;
    if (!spokenText.trim()) return; // never sow empty/random
    lastSowRef.current = now;

    const newFlower = generateFlower(spokenText.trim());

    setFlowers(prev => [...prev, newFlower]);
    setBursts(prev => [...prev, { id: now, x: newFlower.x, y: newFlower.y, color: '#c29470' }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== now)), 2000);
    setIsBlooming(true);
    setTimeout(() => setIsBlooming(false), 800);
    playChimeRef.current();
    setInterimTranscript('');
    setCurrentPromptIdx(prev => Math.min(prev + 1, AFFIRMATIONS.length));
  }, []);

  // Cloud Speech Recognition ONLY — this is what runs on Vercel (HTTPS)
  const startVoiceMode = () => {
    setMode('voice');
    setPhase('active');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceBlocked(true);
      setStatusMsg('Speech not supported in this browser. Use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setStatusMsg('Listening — speak your affirmation...');
      setVoiceBlocked(false);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          // Sow a flower with EXACTLY what was spoken
          sowFlower(result[0].transcript);
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'network') {
        setVoiceBlocked(true);
        setStatusMsg('Speech blocked on localhost. Will work on Vercel (HTTPS). Use Manual Bloom below.');
      } else if (e.error === 'not-allowed') {
        setVoiceBlocked(true);
        setStatusMsg('Microphone access denied. Please allow mic and try again.');
      } else {
        setStatusMsg(`Error: ${e.error}`);
      }
    };

    recognition.onend = () => {
      // Restart unless blocked
      if (!voiceBlocked) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    if (phase === 'active') {
      const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
      return () => {
        clearInterval(timer);
        recognitionRef.current?.stop();
      };
    }
  }, [phase]);

  useEffect(() => {
    if (timeLeft === 0 && phase === 'active') onComplete(flowers);
  }, [timeLeft, flowers, onComplete, phase]);

  if (phase === 'deciding') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#fdfcf0_0%,transparent_100%)] pointer-events-none" />
        <div className="relative z-10 text-center space-y-12 max-w-2xl w-full">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-serif italic text-foreground/80 leading-tight">Enter Your Sanctum</h2>
            <p className="text-foreground/40 font-serif text-lg">Speak or type your intentions into existence.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <motion.button whileHover={{ y: -8 }} whileTap={{ scale: 0.98 }} onClick={startVoiceMode}
              className="p-10 bg-primary/5 border border-primary/20 rounded-3xl flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Mic size={32} /></div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif italic font-bold text-foreground/70">With Voice</h3>
                <p className="text-[10px] text-foreground/30 tracking-widest uppercase">Speak → Flower Blooms</p>
              </div>
            </motion.button>
            <motion.button whileHover={{ y: -8 }} whileTap={{ scale: 0.98 }} onClick={() => { setMode('keyboard'); setPhase('active'); }}
              className="p-10 bg-foreground/5 border border-foreground/10 rounded-3xl flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center text-foreground"><Keyboard size={32} /></div>
              <h3 className="text-2xl font-serif italic font-bold text-foreground/70">With Keyboard</h3>
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {flowers.map((f) => <Flower key={f.id} data={f} />)}
          {bursts.map(b => <FloatingPetal key={b.id} x={b.x} y={b.y} color={b.color} />)}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isBlooming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.08 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary z-30 pointer-events-none" />
        )}
      </AnimatePresence>

      <div className="relative z-40 flex flex-col items-center justify-between min-h-screen p-8 pb-32">
        <div className="text-center w-full max-w-4xl space-y-8">
          <div className="text-6xl font-serif font-bold text-foreground/20 italic">{timeLeft}s</div>

          <div className="min-h-[300px] flex flex-col items-center justify-center space-y-8">
            <AnimatePresence mode="wait">
              {currentPromptIdx < AFFIRMATIONS.length ? (
                <motion.div key={currentPromptIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 text-center">
                  <p className="text-foreground/20 text-[10px] tracking-[0.5em] uppercase font-bold">
                    {mode === 'voice' ? 'Speak clearly:' : 'Type your intention:'}
                  </p>
                  <h2 className="text-4xl md:text-6xl font-serif italic leading-tight text-foreground/70">
                    "{AFFIRMATIONS[currentPromptIdx]}"
                  </h2>

                  {mode === 'voice' && (
                    <AnimatePresence mode="wait">
                      {interimTranscript ? (
                        <motion.p key="interim" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="text-primary text-2xl md:text-3xl font-serif italic px-4">
                          🎙 "{interimTranscript}"
                        </motion.p>
                      ) : voiceBlocked ? (
                        <motion.p key="blocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-amber-500/70 text-xs font-mono max-w-sm leading-relaxed">
                          {statusMsg}
                        </motion.p>
                      ) : (
                        <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-primary/40 text-sm font-serif italic">
                          {statusMsg || 'Say the words above...'}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  )}
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary/60 text-3xl font-serif italic">
                  The sanctuary has taken root...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-full max-w-2xl text-center space-y-8">
          {mode === 'keyboard' ? (
            <div className="flex flex-col items-center">
              <input type="text" value={interimTranscript}
                onChange={(e) => setInterimTranscript(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && interimTranscript.trim()) sowFlower(interimTranscript); }}
                placeholder="Type your intention..."
                className="w-full bg-transparent border-b-2 border-primary/20 p-4 text-3xl md:text-5xl font-serif italic text-center text-foreground/80 focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground/10"
                autoFocus />
              <button onClick={() => sowFlower(interimTranscript)}
                className="mt-10 px-12 py-4 bg-foreground text-background rounded-full font-serif text-lg font-medium shadow-2xl flex items-center gap-3">
                Sow Seed <ArrowRight size={20} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* Manual bloom only shows if voice is blocked */}
              {voiceBlocked && (
                <button onClick={() => sowFlower(AFFIRMATIONS[currentPromptIdx])}
                  className="flex items-center gap-2 px-8 py-3 border border-primary/20 text-primary/60 rounded-full font-serif hover:bg-primary/5 transition-all text-sm">
                  <MicOff size={14} /> Bloom without voice
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${voiceBlocked ? 'bg-amber-400' : 'bg-primary/40'}`} />
                <span className="text-[9px] text-primary/30 tracking-[0.4em] uppercase font-bold">
                  {voiceBlocked ? 'Voice blocked · localhost only issue' : (statusMsg || 'initializing...')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <motion.div className="absolute bottom-0 left-0 h-[2.5px] bg-primary/20"
        initial={{ width: "100%" }} animate={{ width: `${(timeLeft / 45) * 100}%` }} />
    </motion.div>
  );
}
