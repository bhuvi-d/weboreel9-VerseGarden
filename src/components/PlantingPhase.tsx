'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFlower, FlowerInstance } from '@/lib/flowers';
import Flower from './Flower';
import { useAudio } from './AudioEngine';
import { Mic, Keyboard, Sparkles, Leaf, Info, ArrowRight } from 'lucide-react';

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
    animate={{ 
      x: `${x + (Math.random() * 20 - 10)}%`, 
      y: `${y - 20}%`, 
      opacity: 0, 
      scale: 1,
      rotate: 360 
    }}
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
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<string>('Ready');
  const [bursts, setBursts] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  
  const { playChime } = useAudio();
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSowRef = useRef<number>(0);

  const handleSow = useCallback((text: string) => {
    const now = Date.now();
    if (now - lastSowRef.current < 2000) return; 
    lastSowRef.current = now;

    const finalWord = text.trim() || AFFIRMATIONS[currentPromptIdx] || "Bloom";
    try {
      const newFlower = generateFlower(finalWord);
      setFlowers(prev => [...prev, newFlower]);
      const burstId = Date.now();
      setBursts(prev => [...prev, { id: burstId, x: newFlower.x, y: newFlower.y, color: '#c29470' }]);
      setTimeout(() => setBursts(prev => prev.filter(b => b.id !== burstId)), 2000);
      playChime();
      setTranscript('');
      setCurrentPromptIdx(prev => Math.min(prev + 1, AFFIRMATIONS.length));
    } catch (e) {}
  }, [playChime, currentPromptIdx]);

  const startVoiceEngine = async () => {
    setSystemStatus("Starting Voice...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Local Volume Engine (Fail-safe)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioCtx;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkVolume = () => {
        if (!audioContextRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;
        if (average > 38) handleSow(AFFIRMATIONS[currentPromptIdx]);
        requestAnimationFrame(checkVolume);
      };
      checkVolume();

      // Cloud Recognition Engine (Exact words)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onstart = () => setSystemStatus("Cloud Voice Connected");
        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) handleSow(event.results[i][0].transcript);
          }
        };
        recognition.onerror = () => setSystemStatus("Cloud Blocked. Using Local Voice.");
        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) {}
      }
    } catch (e: any) {
      setError("Mic blocked. Switching to keyboard.");
      setMode('keyboard');
    }
  };

  const stopEngines = () => {
    recognitionRef.current?.stop();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current = null;
    streamRef.current = null;
  };

  useEffect(() => {
    if (phase === 'active') {
      const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
      if (mode === 'voice') startVoiceEngine();
      return () => {
        clearInterval(timer);
        stopEngines();
      };
    }
  }, [phase, mode]);

  useEffect(() => { if (timeLeft === 0 && phase === 'active') onComplete(flowers); }, [timeLeft, flowers, onComplete, phase]);

  if (phase === 'deciding') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#fdfcf0_0%,transparent_100%)] pointer-events-none" />
        
        <div className="relative z-10 text-center space-y-12 max-w-2xl">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-serif italic text-foreground/80 leading-tight">How will you sow?</h2>
            <p className="text-foreground/40 font-serif text-lg">Choose your method of planting affirmations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <motion.button
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setMode('voice'); setPhase('active'); }}
              className="p-10 bg-primary/5 border border-primary/20 rounded-3xl group transition-all hover:bg-primary/10 hover:border-primary/40 flex flex-col items-center gap-6"
            >
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Mic size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif italic font-bold text-foreground/70">With Voice</h3>
                <p className="text-[10px] text-foreground/30 uppercase tracking-widest font-bold">Whisper and Bloom</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setMode('keyboard'); setPhase('active'); }}
              className="p-10 bg-foreground/5 border border-foreground/10 rounded-3xl group transition-all hover:bg-foreground/10 hover:border-foreground/20 flex flex-col items-center gap-6"
            >
              <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform">
                <Keyboard size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif italic font-bold text-foreground/70">With Keyboard</h3>
                <p className="text-[10px] text-foreground/30 uppercase tracking-widest font-bold">Type and Settle</p>
              </div>
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#fdfcf0_0%,transparent_100%)] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {flowers.map((f) => <Flower key={f.id} data={f} />)}
          {bursts.map(b => <FloatingPetal key={b.id} x={b.x} y={b.y} color={b.color} />)}
        </AnimatePresence>
      </div>

      <div className="relative z-20 flex flex-col items-center justify-between min-h-screen p-8 pb-32">
        <div className="text-center w-full max-w-4xl space-y-12">
          <div className="space-y-2">
            <div className="text-primary/40 tracking-[0.6em] uppercase text-[9px] font-bold">Phase One</div>
            <div className="text-6xl font-serif font-bold text-foreground/20 italic">{timeLeft}s</div>
          </div>

          <div className="min-h-[160px]">
            <AnimatePresence mode="wait">
              {currentPromptIdx < AFFIRMATIONS.length ? (
                <motion.div key={currentPromptIdx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                  <p className="text-foreground/20 text-[10px] tracking-[0.5em] uppercase font-bold">{mode === 'voice' ? 'Speak Clearly' : 'Type Exactly'}:</p>
                  <h2 className="text-5xl md:text-7xl font-serif italic text-foreground/80 leading-tight">"{AFFIRMATIONS[currentPromptIdx]}"</h2>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary/60 text-3xl font-serif italic text-center">
                  <Sparkles className="w-10 h-10 mx-auto mb-6 opacity-30" />
                   Sanctuary is flourishing...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-full max-w-2xl text-center space-y-12">
          <div className="min-h-[140px] flex flex-col items-center justify-center space-y-8">
            <AnimatePresence mode="wait">
              {mode === 'keyboard' ? (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && transcript.trim()) handleSow(transcript); }}
                    placeholder={`Type "${AFFIRMATIONS[currentPromptIdx]}"...`}
                    className="w-full bg-transparent border-b-2 border-primary/20 p-4 text-3xl md:text-5xl font-serif italic text-center text-foreground/80 focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground/10"
                    autoFocus
                  />
                  <p className="mt-4 text-[9px] text-foreground/20 tracking-[0.4em] uppercase font-bold">Press Enter to Settle</p>
                </motion.div>
              ) : (
                <motion.div key="active-voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-foreground/30 italic font-serif text-2xl md:text-3xl min-h-[1.5em] text-center max-w-lg">
                      {transcript || "Speak your intent..."}
                    </p>
                    {transcript && (
                      <motion.div 
                        initial={{ scaleX: 0 }} 
                        animate={{ scaleX: 1 }} 
                        className="h-[1px] bg-primary/20 w-24"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                      <motion.div key={i} className="w-1.5 h-12 bg-primary/40 rounded-full" animate={{ scaleY: [1, 2, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-center gap-8">
            {mode === 'keyboard' && (
               <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSow(transcript)} className="px-12 py-5 bg-foreground text-background rounded-full font-serif text-xl font-medium shadow-2xl flex items-center gap-4">
                  Sow Intent <ArrowRight size={20} />
               </motion.button>
            )}
            
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-[8px] text-primary/30 tracking-[0.3em] uppercase font-medium">
                <Info size={10} /> {error || `System: ${systemStatus}`}
              </div>
            </div>
          </div>
        </div>

        <div className="text-foreground/10 text-[9px] tracking-[0.8em] uppercase font-bold">{flowers.length} seeds planted</div>
      </div>

      <motion.div className="absolute bottom-0 left-0 h-[2.5px] bg-primary/30" initial={{ width: "0%" }} animate={{ width: `${(timeLeft / 45) * 100}%` }} />
    </motion.div>
  );
}
