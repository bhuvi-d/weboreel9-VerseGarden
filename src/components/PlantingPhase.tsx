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
  const [transcript, setTranscript] = useState('');
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [bursts, setBursts] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  const [isBlooming, setIsBlooming] = useState(false);
  const [micError, setMicError] = useState(false);

  const { playChime } = useAudio();

  // ---- ALL REFS (accessible inside audio loop without stale closures) ----
  const lastSowRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);
  const currentPromptIdxRef = useRef(0); // mirrors currentPromptIdx state, always fresh
  const flowersRef = useRef<FlowerInstance[]>([]);
  const playChimeRef = useRef(playChime);

  // Keep refs in sync with state
  useEffect(() => { currentPromptIdxRef.current = currentPromptIdx; }, [currentPromptIdx]);
  useEffect(() => { flowersRef.current = flowers; }, [flowers]);
  useEffect(() => { playChimeRef.current = playChime; }, [playChime]);

  // Sow a flower — uses ref for idx so it's always fresh inside audio loop
  const sowFlower = useCallback((text?: string) => {
    const now = Date.now();
    if (now - lastSowRef.current < 1500) return;
    lastSowRef.current = now;

    const idx = currentPromptIdxRef.current;
    const word = (text || '').trim() || AFFIRMATIONS[idx] || 'hope';
    const newFlower = generateFlower(word);

    setFlowers(prev => [...prev, newFlower]);
    setBursts(prev => [...prev, { id: now, x: newFlower.x, y: newFlower.y, color: '#c29470' }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== now)), 2000);
    setIsBlooming(true);
    setTimeout(() => setIsBlooming(false), 800);
    playChimeRef.current();
    setTranscript('');
    setCurrentPromptIdx(prev => Math.min(prev + 1, AFFIRMATIONS.length));
  }, []);

  // Pure local voice detection — zero cloud, zero network dependency
  const startVoiceMode = async () => {
    setMode('voice');
    setPhase('active');
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
      let noiseSum = 0;
      let noiseSamples = 0;
      const CALIBRATION = 50; // ~0.8s at 60fps

      const loop = () => {
        if (!audioCtxRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Use all frequencies for robustness
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const level = sum / dataArray.length;

        setMicLevel(level);

        if (noiseSamples < CALIBRATION) {
          noiseSum += level;
          noiseSamples++;
        } else {
          const threshold = (noiseSum / noiseSamples) + 10;
          const speaking = level > threshold;
          setIsSpeaking(speaking);

          if (speaking && !isSpeakingRef.current) {
            isSpeakingRef.current = true;
            if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
          }

          if (!speaking && isSpeakingRef.current) {
            isSpeakingRef.current = false;
            // Bloom 600ms after voice ends
            speakingTimerRef.current = setTimeout(() => {
              sowFlower(); // uses ref — always fresh idx
            }, 600);
          }
        }
        requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setMicError(true);
    }
  };

  useEffect(() => {
    if (phase === 'active') {
      const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
      return () => {
        clearInterval(timer);
        if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
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
                <p className="text-[10px] text-foreground/30 tracking-widest uppercase">Speak → Pause → Garden Blooms</p>
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
      {/* Flowers layer */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {flowers.map((f) => <Flower key={f.id} data={f} />)}
          {bursts.map(b => <FloatingPetal key={b.id} x={b.x} y={b.y} color={b.color} />)}
        </AnimatePresence>
      </div>

      {/* Bloom flash */}
      <AnimatePresence>
        {isBlooming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.08 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary z-30 pointer-events-none" />
        )}
      </AnimatePresence>

      <div className="relative z-40 flex flex-col items-center justify-between min-h-screen p-8 pb-32">
        <div className="text-center w-full max-w-4xl space-y-8">
          <div className="text-6xl font-serif font-bold text-foreground/20 italic">{timeLeft}s</div>

          <div className="min-h-[280px] flex flex-col items-center justify-center space-y-10">
            <AnimatePresence mode="wait">
              {currentPromptIdx < AFFIRMATIONS.length ? (
                <motion.div key={currentPromptIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <p className="text-foreground/20 text-[10px] tracking-[0.5em] uppercase font-bold">
                    {mode === 'voice' ? 'Speak clearly:' : 'Type your intention:'}
                  </p>
                  <motion.h2
                    className="text-4xl md:text-6xl font-serif italic leading-tight transition-colors duration-150"
                    style={{ color: isSpeaking ? '#94a187' : 'rgba(30,28,26,0.7)' }}
                  >
                    "{AFFIRMATIONS[currentPromptIdx]}"
                  </motion.h2>
                  {mode === 'voice' && (
                    <p className="text-primary/50 text-sm font-serif italic">
                      {isSpeaking ? '🌱 Planting your seed...' : 'Speak, then pause to bloom.'}
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary/60 text-3xl font-serif italic">
                  The sanctuary has taken root...
                </motion.div>
              )}
            </AnimatePresence>

            {/* Waveform bars — only shown in voice mode */}
            {mode === 'voice' && (
              <div className="flex items-end gap-1 h-16 px-4">
                {[...Array(28)].map((_, i) => {
                  const barHeight = Math.max(4, micLevel * (0.5 + Math.abs(Math.sin(i * 0.8)) * 1.2));
                  return (
                    <motion.div
                      key={i}
                      className="w-2 rounded-full"
                      style={{ backgroundColor: isSpeaking ? '#94a187' : 'rgba(148,161,135,0.2)' }}
                      animate={{ height: barHeight }}
                      transition={{ duration: 0.08 }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="w-full max-w-2xl text-center space-y-8">
          {mode === 'keyboard' ? (
            <div className="flex flex-col items-center">
              <input
                type="text" value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && transcript.trim()) sowFlower(transcript); }}
                placeholder="Type your intention..."
                className="w-full bg-transparent border-b-2 border-primary/20 p-4 text-3xl md:text-5xl font-serif italic text-center text-foreground/80 focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground/10"
                autoFocus
              />
              <button onClick={() => sowFlower(transcript)}
                className="mt-10 px-12 py-4 bg-foreground text-background rounded-full font-serif text-lg font-medium shadow-2xl flex items-center gap-3">
                Sow Seed <ArrowRight size={20} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              {micError && <p className="text-red-400 text-xs">Mic blocked — please allow microphone access in your browser.</p>}
              <button onClick={() => sowFlower()}
                className="px-10 py-3 border border-primary/20 text-primary/50 rounded-full font-serif hover:bg-primary/5 transition-all text-sm tracking-wide">
                Manual Bloom ↓
              </button>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isSpeaking ? 'bg-primary' : 'bg-primary/30'}`} />
                <span className="text-[9px] text-primary/30 tracking-[0.4em] uppercase font-bold">
                  {micError ? 'Mic blocked' : isSpeaking ? 'Voice Detected ✓' : 'Listening · Local · No Cloud'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <motion.div className="absolute bottom-0 left-0 h-[2.5px] bg-primary/20"
        initial={{ width: "100%" }} animate={{ width: `${(timeLeft / 45) * 100}%` }} />
    </motion.div>
  );
}
