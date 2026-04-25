'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFlower, FlowerInstance } from '@/lib/flowers';
import Flower from './Flower';
import { useAudio } from './AudioEngine';
import { Mic, Keyboard, Leaf, ArrowRight, Sparkles } from 'lucide-react';

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
  const [realTranscript, setRealTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  const { playChime } = useAudio();

  const lastSowRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const currentPromptIdxRef = useRef(0);
  const playChimeRef = useRef(playChime);

  useEffect(() => { currentPromptIdxRef.current = currentPromptIdx; }, [currentPromptIdx]);
  useEffect(() => { playChimeRef.current = playChime; }, [playChime]);

  const sowFlower = useCallback((text: string) => {
    const now = Date.now();
    if (now - lastSowRef.current < 1500) return;
    const finalWord = text.trim() || AFFIRMATIONS[currentPromptIdxRef.current] || "Peace";
    lastSowRef.current = now;

    const newFlower = generateFlower(finalWord);
    setFlowers(prev => [...prev, newFlower]);
    setBursts(prev => [...prev, { id: now, x: newFlower.x, y: newFlower.y, color: '#c29470' }]);
    
    // Clear transcript for next one
    setRealTranscript('');
    
    setIsBlooming(true);
    setTimeout(() => setIsBlooming(false), 800);
    playChimeRef.current();
    
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== now)), 2000);

    setCurrentPromptIdx(prev => {
      const next = prev + 1;
      if (next >= AFFIRMATIONS.length) {
        // Delay completion to let the last flower be seen
        setTimeout(() => onComplete([...flowers, newFlower]), 2000);
        return prev;
      }
      return next;
    });
  }, [flowers, onComplete]);

  const startVoiceMode = async () => {
    setMode('voice');
    setPhase('active');

    // INITIALIZE SPEECH RECOGNITION (CLEANEST VERSION)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const final = event.results[i][0].transcript;
            setRealTranscript(final);
            sowFlower(final);
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (interim) setRealTranscript(interim);
      };

      recognition.onerror = (e: any) => {
        console.error("Speech Error:", e.error);
        if (e.error === 'network') {
          // If network error, we don't restart automatically to avoid infinite alerts
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (mode === 'voice' && phase === 'active' && !voiceBlockedRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognitionRef.current = recognition;
      try { recognition.start(); } catch {}
    }

    // LOCAL MIC FOR VISUALS (ALWAYS WORKS)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!audioCtxRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const level = sum / dataArray.length;
        setMicLevel(level);
        setIsSpeaking(level > 15);
        requestAnimationFrame(loop);
      };
      loop();
    } catch (err) {
      console.warn("Mic access for visuals denied");
    }
  };

  const voiceBlockedRef = useRef(false);

  useEffect(() => {
    if (phase === 'active') {
      const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
      return () => {
        clearInterval(timer);
        voiceBlockedRef.current = true;
        recognitionRef.current?.stop();
        audioCtxRef.current?.close();
      };
    }
  }, [phase]);

  const currentAffirmation = AFFIRMATIONS[currentPromptIdx] || '';

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
                <p className="text-[10px] text-foreground/30 tracking-widest uppercase">Speak clearly — Watch it grow</p>
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
        {isBlooming && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.12 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-primary z-30 pointer-events-none" />}
      </AnimatePresence>

      <div className="relative z-40 flex flex-col items-center justify-between min-h-screen p-8 pb-32">
        <div className="text-center w-full max-w-4xl space-y-8">
          <div className="text-6xl font-serif font-bold text-foreground/20 italic">{timeLeft}s</div>

          <div className="min-h-[340px] flex flex-col items-center justify-center space-y-12">
            <AnimatePresence mode="wait">
              {currentPromptIdx < AFFIRMATIONS.length ? (
                <motion.div key={currentPromptIdx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="space-y-8 text-center">
                  <p className="text-foreground/20 text-[10px] tracking-[0.5em] uppercase font-bold">
                    Current Seed:
                  </p>
                  <h2 className="text-5xl md:text-7xl font-serif italic leading-tight text-foreground/80">
                    "{currentAffirmation}"
                  </h2>

                  {mode === 'voice' && (
                    <div className="min-h-[4rem] flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        {realTranscript ? (
                          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-primary text-3xl font-serif italic">
                            <Sparkles className="inline-block mr-2 text-primary/50" size={24} />
                            {realTranscript}
                          </motion.p>
                        ) : (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-foreground/30 text-lg font-serif italic">
                            Waiting for your voice...
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary text-4xl font-serif italic">
                  The Garden of Verse is complete.
                </motion.div>
              )}
            </AnimatePresence>

            {/* Visualizer */}
            {mode === 'voice' && (
              <div className="flex items-end gap-1.5 h-16 px-4">
                {[...Array(32)].map((_, i) => (
                  <motion.div key={i} className="w-1.5 rounded-full bg-primary/20"
                    animate={{ 
                      height: Math.max(6, micLevel * (0.3 + Math.abs(Math.sin(i * 0.5)) * 1.5)),
                      backgroundColor: micLevel > 15 ? '#94a187' : 'rgba(148,161,135,0.2)'
                    }}
                    transition={{ duration: 0.1 }} />
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
                Bloom <ArrowRight size={20} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => sowFlower(realTranscript || currentAffirmation)}
                className="group relative px-16 py-5 bg-foreground text-background rounded-full font-serif text-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center gap-3">
                   Bloom <Sparkles size={20} />
                </span>
              </motion.button>
              
              <div className="flex items-center gap-3 opacity-40">
                <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-primary animate-pulse' : 'bg-foreground/20'}`} />
                <span className="text-[10px] tracking-[0.5em] uppercase font-bold">
                  {isListening ? 'Speech Engine Active' : 'Voice Visualizer Ready'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-foreground/5">
        <motion.div className="h-full bg-primary/40"
          initial={{ width: "100%" }} animate={{ width: `${(timeLeft / 45) * 100}%` }} />
      </div>
    </motion.div>
  );
}
