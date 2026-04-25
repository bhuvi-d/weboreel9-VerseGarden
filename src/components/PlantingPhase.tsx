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
  const [systemStatus, setSystemStatus] = useState<string>('Ready');
  const [bursts, setBursts] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  const [isBlooming, setIsBlooming] = useState(false);
  
  const { playChime } = useAudio();
  const lastSowRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);

  const handleSow = useCallback((text: string) => {
    const now = Date.now();
    if (now - lastSowRef.current < 1200) return; 
    lastSowRef.current = now;

    const finalWord = text.trim() || AFFIRMATIONS[currentPromptIdx];
    try {
      const newFlower = generateFlower(finalWord);
      setFlowers(prev => [...prev, newFlower]);
      const burstId = Date.now();
      setBursts(prev => [...prev, { id: burstId, x: newFlower.x, y: newFlower.y, color: '#c29470' }]);
      setTimeout(() => setBursts(prev => prev.filter(b => b.id !== burstId)), 2000);
      
      setIsBlooming(true);
      setTimeout(() => setIsBlooming(false), 800);
      
      playChime();
      setTranscript('');
      setCurrentPromptIdx(prev => Math.min(prev + 1, AFFIRMATIONS.length));
    } catch (e) {}
  }, [playChime, currentPromptIdx]);

  // THE REVELATION FIX: Do NOT use getUserMedia. Let SpeechRecognition handle the mic.
  const startVoiceMode = () => {
    setMode('voice');
    setPhase('active');
    setSystemStatus("Activating Cloud Voice...");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSystemStatus("Not Supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setSystemStatus("Cloud Voice Connected");
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          handleSow(event.results[i][0].transcript);
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(interim);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech Recognition Error:", e.error);
      setSystemStatus(`Voice Blocked: ${e.error}`);
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

  useEffect(() => { if (timeLeft === 0 && phase === 'active') onComplete(flowers); }, [timeLeft, flowers, onComplete, phase]);

  if (phase === 'deciding') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#fdfcf0_0%,transparent_100%)] pointer-events-none" />
        <div className="relative z-10 text-center space-y-12 max-w-2xl w-full">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-serif italic text-foreground/80 leading-tight">Your Digital Sanctuary</h2>
            <p className="text-foreground/40 font-serif text-lg">Speak or type to begin the sowing.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <motion.button whileHover={{ y: -8 }} whileTap={{ scale: 0.98 }} onClick={startVoiceMode} className="p-10 bg-primary/5 border border-primary/20 rounded-3xl flex flex-col items-center gap-6"><div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Mic size={32} /></div><h3 className="text-2xl font-serif italic font-bold text-foreground/70">With Voice</h3></motion.button>
            <motion.button whileHover={{ y: -8 }} whileTap={{ scale: 0.98 }} onClick={() => { setMode('keyboard'); setPhase('active'); }} className="p-10 bg-foreground/5 border border-foreground/10 rounded-3xl flex flex-col items-center gap-6"><div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center text-foreground"><Keyboard size={32} /></div><h3 className="text-2xl font-serif italic font-bold text-foreground/70">With Keyboard</h3></motion.button>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.08 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-primary z-30 pointer-events-none flex items-center justify-center" />
        )}
      </AnimatePresence>

      <div className="relative z-40 flex flex-col items-center justify-between min-h-screen p-8 pb-32">
        <div className="text-center w-full max-w-4xl space-y-8">
          <div className="text-6xl font-serif font-bold text-foreground/20 italic">{timeLeft}s</div>
          <div className="min-h-[260px] flex flex-col items-center justify-center space-y-8">
            <AnimatePresence mode="wait">
              {currentPromptIdx < AFFIRMATIONS.length ? (
                <motion.div key={currentPromptIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <p className="text-foreground/20 text-[10px] tracking-[0.5em] uppercase font-bold">Say Clearly:</p>
                  <h2 className="text-4xl md:text-6xl font-serif italic text-foreground/70 leading-tight">"{AFFIRMATIONS[currentPromptIdx]}"</h2>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary/60 text-3xl font-serif italic">The garden has taken root...</motion.div>
              )}
            </AnimatePresence>
            
            {mode === 'voice' && (
              <div className="flex flex-col items-center gap-12">
                <div className="relative min-h-[4rem] flex items-center justify-center">
                   <p className="text-primary text-3xl md:text-5xl font-serif italic text-center max-w-2xl">
                     {transcript || "..."}
                   </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-2xl text-center space-y-12">
          {mode === 'keyboard' ? (
            <div className="flex flex-col items-center">
               <input
                 type="text" value={transcript}
                 onChange={(e) => setTranscript(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter' && transcript.trim()) handleSow(transcript); }}
                 placeholder={`Type your intention...`}
                 className="w-full bg-transparent border-b-2 border-primary/20 p-4 text-3xl md:text-5xl font-serif italic text-center text-foreground/80 focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground/10"
                 autoFocus
               />
               <button onClick={() => handleSow(transcript)} className="mt-10 px-12 py-4 bg-foreground text-background rounded-full font-serif text-lg font-medium shadow-2xl flex items-center gap-3">Sow Intent <ArrowRight size={20}/></button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <button onClick={() => handleSow(transcript || AFFIRMATIONS[currentPromptIdx])} className="px-10 py-4 border-2 border-primary/20 text-primary/60 rounded-full font-serif text-lg hover:bg-primary/5 transition-all shadow-lg">Manual Sow Fallback</button>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                <div className="text-[9px] text-primary/30 tracking-[0.5em] uppercase font-bold">{systemStatus}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <motion.div className="absolute bottom-0 left-0 h-[2.5px] bg-primary/20" initial={{ width: "0%" }} animate={{ width: `${(timeLeft / 45) * 100}%` }} />
    </motion.div>
  );
}
