'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFlower, FlowerInstance } from '@/lib/flowers';
import Flower from './Flower';
import { useAudio } from './AudioEngine';
import { Mic, Keyboard, Leaf, ArrowRight } from 'lucide-react';

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
    transition={{ duration: 2.5, ease: "easeOut" }}
    className="absolute pointer-events-none"
    style={{ color }}
  >
    <Leaf size={14} fill="currentColor" />
  </motion.div>
);

export default function PlantingPhase({ onComplete }: { onComplete: (flowers: FlowerInstance[]) => void }) {
  const [phase, setPhase] = useState<'deciding' | 'active'>('deciding');
  const [mode, setMode] = useState<'voice' | 'keyboard'>('keyboard');
  const [timeLeft, setTimeLeft] = useState(45);
  const [flowers, setFlowers] = useState<FlowerInstance[]>([]);
  const [typedText, setTypedText] = useState('');
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const [isBlooming, setIsBlooming] = useState(false);
  const [bursts, setBursts] = useState<{ id: number, x: number, y: number, color: string }[]>([]);

  // Voice state
  const [micLevel, setMicLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Simulated "recognised" text — letter by letter as user speaks
  const [recognisedChars, setRecognisedChars] = useState(0);

  const { playChime } = useAudio();

  const lastSowRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSpeakingRef = useRef(false);
  const currentPromptIdxRef = useRef(0);
  const playChimeRef = useRef(playChime);

  useEffect(() => { currentPromptIdxRef.current = currentPromptIdx; }, [currentPromptIdx]);
  useEffect(() => { playChimeRef.current = playChime; }, [playChime]);

  const sowFlower = useCallback((text: string) => {
    const now = Date.now();
    if (now - lastSowRef.current < 1500) return;
    if (!text.trim()) return;
    lastSowRef.current = now;

    const newFlower = generateFlower(text.trim());
    setFlowers(prev => [...prev, newFlower]);
    setBursts(prev => [...prev, { id: now, x: newFlower.x, y: newFlower.y, color: '#c29470' }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== now)), 2000);
    setIsBlooming(true);
    setTimeout(() => setIsBlooming(false), 800);
    playChimeRef.current();
    setRecognisedChars(0);
    setCurrentPromptIdx(prev => {
      const next = Math.min(prev + 1, AFFIRMATIONS.length);
      currentPromptIdxRef.current = next;
      return next;
    });
  }, []);

  const startVoiceMode = async () => {
    setMode('voice');
    setPhase('active');

    // First try cloud STT (works on some networks)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let cloudWorking = false;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        cloudWorking = true;
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            sowFlower(event.results[i][0].transcript);
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (interim) {
          // Show cloud transcript
          const currentAffirmation = AFFIRMATIONS[currentPromptIdxRef.current];
          setRecognisedChars(Math.min(interim.length * 2, currentAffirmation?.length || 0));
        }
      };

      recognition.onerror = () => { /* silently fall through to local */ };
      recognition.onend = () => { if (!cloudWorking) { /* local handles it */ } else try { recognition.start(); } catch {} };
      try { recognition.start(); } catch {}
    }

    // Always also start local audio detection (works everywhere)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let noiseSum = 0, noiseSamples = 0;

      const loop = () => {
        if (!audioCtxRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const level = sum / dataArray.length;
        setMicLevel(level);

        if (noiseSamples < 50) { noiseSum += level; noiseSamples++; }
        else {
          const threshold = (noiseSum / noiseSamples) + 10;
          const speaking = level > threshold;
          setIsSpeaking(speaking);

          if (speaking && !isSpeakingRef.current) {
            isSpeakingRef.current = true;
            if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);

            if (!cloudWorking) {
              // Simulate letter-by-letter reveal of the affirmation
              if (revealTimerRef.current) clearInterval(revealTimerRef.current);
              const targetText = AFFIRMATIONS[currentPromptIdxRef.current] || '';
              let charIdx = 0;
              setRecognisedChars(0);
              revealTimerRef.current = setInterval(() => {
                charIdx++;
                setRecognisedChars(charIdx);
                if (charIdx >= targetText.length) {
                  if (revealTimerRef.current) clearInterval(revealTimerRef.current);
                }
              }, 60);
            }
          }

          if (!speaking && isSpeakingRef.current) {
            isSpeakingRef.current = false;
            if (revealTimerRef.current) { clearInterval(revealTimerRef.current); revealTimerRef.current = null; }

            speakingTimerRef.current = setTimeout(() => {
              if (!cloudWorking) {
                sowFlower(AFFIRMATIONS[currentPromptIdxRef.current] || '');
              }
            }, 700);
          }
        }
        requestAnimationFrame(loop);
      };
      loop();
    } catch {
      // Mic denied — nothing to do
    }
  };

  useEffect(() => {
    if (phase === 'active') {
      const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
      return () => {
        clearInterval(timer);
        if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
        if (revealTimerRef.current) clearInterval(revealTimerRef.current);
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
      };
    }
  }, [phase]);

  useEffect(() => {
    if (timeLeft === 0 && phase === 'active') onComplete(flowers);
  }, [timeLeft, flowers, onComplete, phase]);

  const currentAffirmation = AFFIRMATIONS[currentPromptIdx] || '';
  const recognisedText = currentAffirmation.slice(0, recognisedChars);

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
        {isBlooming && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.08 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-primary z-30 pointer-events-none" />}
      </AnimatePresence>

      <div className="relative z-40 flex flex-col items-center justify-between min-h-screen p-8 pb-32">
        <div className="text-center w-full max-w-4xl space-y-8">
          <div className="text-6xl font-serif font-bold text-foreground/20 italic">{timeLeft}s</div>

          <div className="min-h-[320px] flex flex-col items-center justify-center space-y-8">
            <AnimatePresence mode="wait">
              {currentPromptIdx < AFFIRMATIONS.length ? (
                <motion.div key={currentPromptIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 text-center">
                  <p className="text-foreground/20 text-[10px] tracking-[0.5em] uppercase font-bold">
                    {mode === 'voice' ? 'Say clearly:' : 'Type your intention:'}
                  </p>

                  {/* The prompt — dims when speaking */}
                  <h2 className="text-4xl md:text-6xl font-serif italic leading-tight transition-all duration-300"
                    style={{ color: isSpeaking ? 'rgba(30,28,26,0.2)' : 'rgba(30,28,26,0.7)' }}>
                    "{currentAffirmation}"
                  </h2>

                  {/* Live "recognised" text overlay */}
                  {mode === 'voice' && recognisedChars > 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-primary text-3xl md:text-5xl font-serif italic"
                    >
                      🎙 "{recognisedText}<span className="animate-pulse">|</span>"
                    </motion.p>
                  )}

                  {mode === 'voice' && recognisedChars === 0 && (
                    <p className="text-primary/40 text-sm font-serif italic">
                      {isSpeaking ? '🌱 Planting your seed...' : 'Speak — then pause to bloom.'}
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary/60 text-3xl font-serif italic">
                  The sanctuary has taken root...
                </motion.div>
              )}
            </AnimatePresence>

            {/* Waveform */}
            {mode === 'voice' && (
              <div className="flex items-end gap-1 h-14 px-4">
                {[...Array(30)].map((_, i) => (
                  <motion.div key={i} className="w-1.5 rounded-full"
                    style={{ backgroundColor: isSpeaking ? '#94a187' : 'rgba(148,161,135,0.15)' }}
                    animate={{ height: Math.max(4, micLevel * (0.4 + Math.abs(Math.sin(i * 0.7)) * 1.2)) }}
                    transition={{ duration: 0.07 }} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-2xl text-center space-y-8">
          {mode === 'keyboard' ? (
            <div className="flex flex-col items-center">
              <input type="text" value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && typedText.trim()) sowFlower(typedText); }}
                placeholder="Type your intention..."
                className="w-full bg-transparent border-b-2 border-primary/20 p-4 text-3xl md:text-5xl font-serif italic text-center text-foreground/80 focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground/10"
                autoFocus />
              <button onClick={() => sowFlower(typedText)}
                className="mt-10 px-12 py-4 bg-foreground text-background rounded-full font-serif text-lg font-medium shadow-2xl flex items-center gap-3">
                Sow Seed <ArrowRight size={20} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <button onClick={() => sowFlower(currentAffirmation)}
                className="px-8 py-3 border border-primary/20 text-primary/50 rounded-full font-serif hover:bg-primary/5 transition-all text-sm">
                Skip to Bloom ↓
              </button>
              <div className="flex items-center gap-2">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-primary/40"
                  animate={{ scale: isSpeaking ? [1, 1.8, 1] : 1 }}
                  transition={{ repeat: isSpeaking ? Infinity : 0, duration: 0.5 }} />
                <span className="text-[9px] text-primary/30 tracking-[0.4em] uppercase font-bold">
                  {isSpeaking ? 'Voice Detected ✓' : 'Listening · Mic Active'}
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
