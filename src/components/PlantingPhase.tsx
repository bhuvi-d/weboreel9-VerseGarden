'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFlower, FlowerInstance } from '@/lib/flowers';
import Flower from './Flower';
import { useAudio } from './AudioEngine';
import { Mic, Keyboard, Sparkles, Leaf, Info, ArrowRight, RotateCcw, Volume2, AlertCircle, Settings } from 'lucide-react';

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
  const [micLevel, setMicLevel] = useState(0);
  const [bursts, setBursts] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  const [isBlooming, setIsBlooming] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  
  const { playChime } = useAudio();
  const lastSowRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const thresholdRef = useRef<number>(15);

  const handleSow = useCallback((text: string) => {
    const now = Date.now();
    if (now - lastSowRef.current < 1500) return; 
    lastSowRef.current = now;

    const finalWord = text.trim() || AFFIRMATIONS[currentPromptIdx];
    try {
      const newFlower = generateFlower(finalWord);
      setFlowers(prev => [...prev, newFlower]);
      const burstId = Date.now();
      setBursts(prev => [...prev, { id: burstId, x: newFlower.x, y: newFlower.y, color: '#c29470' }]);
      setTimeout(() => setBursts(prev => prev.filter(b => b.id !== burstId)), 2000);
      
      setIsBlooming(true);
      setTimeout(() => setIsBlooming(false), 500);
      
      playChime();
      setTranscript('');
      setCurrentPromptIdx(prev => Math.min(prev + 1, AFFIRMATIONS.length));
    } catch (e) {}
  }, [playChime, currentPromptIdx]);

  const initVoiceEngines = async () => {
    setSystemStatus("Connecting...");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 1. Local Sound Engine (Always Active)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!audioCtxRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const level = sum / dataArray.length;
        setMicLevel(level);

        if (level > thresholdRef.current && Date.now() - lastSowRef.current > 2000) {
          handleSow(""); 
        }
        requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 2. Cloud Recognition Engine (With Server-Endpoint Bypass Attempt)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // More stable on problematic networks
        recognition.interimResults = true;
        recognition.lang = 'en-GB'; // Switch to GB endpoint to bypass potential regional blocks

        recognition.onstart = () => setSystemStatus("Cloud Voice Connected");
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) handleSow(event.results[i][0].transcript);
            else interim += event.results[i][0].transcript;
          }
          setTranscript(interim);
        };
        recognition.onerror = (e: any) => {
          console.error("Speech Error:", e.error);
          if (e.error === 'network') {
            setShowTroubleshoot(true);
            setSystemStatus("Cloud Error (Network)");
          }
        };
        recognition.onend = () => {
          if (mode === 'voice' && phase === 'active' && timeLeft > 0) {
            setTimeout(() => {
              try { recognition.start(); } catch (err) {}
            }, 100);
          }
        };
        recognitionRef.current = recognition;
        recognition.start();
      }
    } catch (e) {
      setError("Microphone access denied.");
    }
  };

  useEffect(() => {
    if (phase === 'active') {
      const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
      return () => {
        clearInterval(timer);
        recognitionRef.current?.stop();
        audioCtxRef.current?.close();
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
            <h2 className="text-4xl md:text-6xl font-serif italic text-foreground/80 leading-tight">Enter Your Sanctum</h2>
            <p className="text-foreground/40 font-serif text-lg">Choose your method of planting seeds.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <motion.button whileHover={{ y: -8 }} whileTap={{ scale: 0.98 }} onClick={() => { setMode('voice'); setPhase('active'); initVoiceEngines(); }} className="p-10 bg-primary/5 border border-primary/20 rounded-3xl flex flex-col items-center gap-6"><div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Mic size={32} /></div><h3 className="text-2xl font-serif italic font-bold text-foreground/70">With Voice</h3></motion.button>
            <motion.button whileHover={{ y: -8 }} whileTap={{ scale: 0.98 }} onClick={() => { setMode('keyboard'); setPhase('active'); }} className="p-10 bg-foreground/5 border border-foreground/10 rounded-3xl flex flex-col items-center gap-6"><div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center text-foreground"><Keyboard size={32} /></div><h3 className="text-2xl font-serif italic font-bold text-foreground/70">With Keyboard</h3></motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative min-h-screen overflow-hidden bg-background">
      <AnimatePresence>{isBlooming && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-primary z-10 pointer-events-none" />}</AnimatePresence>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#fdfcf0_0%,transparent_100%)] pointer-events-none" />
      
      <div className="relative z-20 flex flex-col items-center justify-between min-h-screen p-8 pb-32">
        <div className="text-center w-full max-w-4xl space-y-8">
          <div className="text-6xl font-serif font-bold text-foreground/20 italic">{timeLeft}s</div>
          <div className="min-h-[220px] flex flex-col items-center justify-center space-y-8">
            <AnimatePresence mode="wait">
              {currentPromptIdx < AFFIRMATIONS.length ? (
                <motion.div key={currentPromptIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <h2 className="text-4xl md:text-6xl font-serif italic text-foreground/70 leading-tight">"{AFFIRMATIONS[currentPromptIdx]}"</h2>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary/60 text-3xl font-serif italic">Sanctuary complete...</motion.div>
              )}
            </AnimatePresence>
            
            {mode === 'voice' && (
              <div className="flex flex-col items-center gap-8">
                <p className="text-primary text-3xl md:text-5xl font-serif italic text-center max-w-2xl min-h-[1.5em]">
                   {transcript || (micLevel > thresholdRef.current ? "Vocalizing..." : "...") }
                </p>
                <div className="flex items-end gap-1.5 h-12">
                  {[...Array(16)].map((_, i) => (
                    <motion.div key={i} className="w-1.5 rounded-full transition-all duration-100" style={{ backgroundColor: micLevel > thresholdRef.current ? '#94a187' : 'rgba(148, 161, 135, 0.2)', height: Math.max(4, micLevel * (0.5 + Math.random() * 1.5)) }} animate={{ height: Math.max(4, micLevel * (0.5 + Math.random() * 1.5)) }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-2xl text-center space-y-8">
          {showTroubleshoot && mode === 'voice' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-red-50/50 border border-red-100 rounded-2xl space-y-4 text-left">
              <div className="flex items-start gap-3 text-red-600">
                <AlertCircle size={20} className="shrink-0 mt-1" />
                <div className="space-y-2">
                  <p className="font-bold text-sm">Windows Speech Block Detected</p>
                  <p className="text-xs leading-relaxed opacity-80">Chrome's speech service is blocked by your OS. To fix this:</p>
                  <ol className="text-[10px] space-y-1 list-decimal ml-4 opacity-70">
                    <li>Open Windows <b>Settings</b> &rarr; <b>Privacy & Security</b>.</li>
                    <li>Go to <b>Speech</b> and turn ON <b>"Online Speech Recognition"</b>.</li>
                    <li>Refresh this page and try again.</li>
                  </ol>
                  <button onClick={() => setShowTroubleshoot(false)} className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 hover:text-foreground">Dismiss</button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col items-center gap-6">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
               <div className="text-[9px] text-primary/30 tracking-[0.5em] uppercase font-bold text-center">{error || systemStatus}</div>
             </div>
             {mode === 'voice' && (
                <button onClick={() => handleSow("")} className="text-[10px] text-primary/40 hover:text-primary transition-colors tracking-[0.4em] uppercase font-bold border-b border-primary/10">Skip to Bloom</button>
             )}
          </div>
        </div>
      </div>
      <motion.div className="absolute bottom-0 left-0 h-[2.5px] bg-primary/20" initial={{ width: "0%" }} animate={{ width: `${(timeLeft / 45) * 100}%` }} />
    </motion.div>
  );
}
