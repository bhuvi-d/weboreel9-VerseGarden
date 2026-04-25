'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFlower, FlowerInstance } from '@/lib/flowers';
import Flower from './Flower';
import { useAudio } from './AudioEngine';
import { Mic, MicOff, Sparkles, Leaf, Info } from 'lucide-react';

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
  const [timeLeft, setTimeLeft] = useState(45);
  const [flowers, setFlowers] = useState<FlowerInstance[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
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
    if (now - lastSowRef.current < 2500) return; // Prevent double sowing
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

  // The "Dual Engine" - Handles both Recognition and Volume Detection simultaneously
  const stopVoice = () => {
    recognitionRef.current?.stop();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current = null;
    streamRef.current = null;
    setIsVoiceActive(false);
    setSystemStatus("Stopped");
  };

  const startVoice = async () => {
    setSystemStatus("Starting Engines...");
    setError(null);

    try {
      // 1. Get Microphone Access (The primary user-gesture requirement)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Start ENGINE A: Local Volume Detection (Fail-safe, works without internet)
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

        // If loud noise detected (speaking), sow the flower
        if (average > 35) {
          handleSow(AFFIRMATIONS[currentPromptIdx]);
        }
        requestAnimationFrame(checkVolume);
      };
      checkVolume();

      // 3. Start ENGINE B: Cloud Speech Recognition (Enhanced experience)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setSystemStatus("Cloud Voice Active");
        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) handleSow(event.results[i][0].transcript);
          }
        };
        recognition.onerror = () => setSystemStatus("Cloud API Blocked. Using Local Voice.");
        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) {}
      } else {
        setSystemStatus("Local Voice Active");
      }

      setIsVoiceActive(true);
    } catch (e: any) {
      console.error(e);
      setSystemStatus("Mic Failed");
      setError("Please grant microphone access to speak.");
      setIsVoiceActive(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => {
      clearInterval(timer);
      stopVoice();
    };
  }, []);

  useEffect(() => { if (timeLeft === 0) onComplete(flowers); }, [timeLeft, flowers, onComplete]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#fdfcf0_0%,transparent_100%)] pointer-events-none" />
      
      {/* Bloom Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {flowers.map((f) => <Flower key={f.id} data={f} />)}
          {bursts.map(b => <FloatingPetal key={b.id} x={b.x} y={b.y} color={b.color} />)}
        </AnimatePresence>
      </div>

      <div className="relative z-20 flex flex-col items-center justify-between min-h-screen p-8 pb-32">
        <div className="text-center w-full max-w-4xl space-y-12">
          <div className="space-y-2">
            <div className="text-primary/40 tracking-[0.6em] uppercase text-[9px] font-bold">The First Sowing</div>
            <div className="text-6xl font-serif font-bold text-foreground/20 italic">{timeLeft}s</div>
          </div>

          <div className="min-h-[160px]">
            <AnimatePresence mode="wait">
              {currentPromptIdx < AFFIRMATIONS.length ? (
                <motion.div key={currentPromptIdx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                  <p className="text-foreground/20 text-[10px] tracking-[0.5em] uppercase font-bold">Say or Type:</p>
                  <h2 className="text-5xl md:text-7xl font-serif italic text-foreground/80 leading-tight">"{AFFIRMATIONS[currentPromptIdx]}"</h2>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary/60 text-3xl font-serif italic text-center">
                  <Sparkles className="w-10 h-10 mx-auto mb-6 opacity-30" />
                  Your garden is alive...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Unified Input System */}
        <div className="w-full max-w-2xl text-center space-y-12">
          <div className="min-h-[140px] flex flex-col items-center justify-center space-y-8">
            <AnimatePresence mode="wait">
              {!isVoiceActive ? (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && transcript.trim()) handleSow(transcript); }}
                    placeholder={`Type to sow...`}
                    className="w-full bg-transparent border-b-2 border-primary/20 p-4 text-3xl md:text-5xl font-serif italic text-center text-foreground/80 focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground/10"
                    autoFocus
                  />
                  <p className="mt-4 text-[9px] text-foreground/20 tracking-[0.4em] uppercase font-bold">Press Enter or click Mic to speak</p>
                </motion.div>
              ) : (
                <motion.div key="active-voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                  <p className="text-foreground/50 italic font-serif text-3xl md:text-4xl">Listening to you...</p>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                      <motion.div key={i} className="w-1 h-8 bg-primary/40 rounded-full" animate={{ scaleY: [1, 1.5, 1] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }} />
                    ))}
                  </div>
                  <p className="text-[10px] text-primary/40 uppercase tracking-widest">Just speak to grow the garden</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-10">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isVoiceActive ? stopVoice : startVoice}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl relative ${
                  isVoiceActive ? 'bg-primary text-background' : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {isVoiceActive && (
                  <motion.div className="absolute inset-0 rounded-full border-2 border-primary" animate={{ scale: [1, 1.5], opacity: [1, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                )}
                {isVoiceActive ? <MicOff size={24} /> : <Mic size={24} />}
              </motion.button>
              {!isVoiceActive && (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSow(transcript)} className="px-10 py-4 bg-foreground text-background rounded-full font-serif text-lg font-medium shadow-xl">Sow Seed</motion.button>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] text-foreground/20 tracking-[0.5em] uppercase font-bold">{isVoiceActive ? "Speak into the light" : "Voice or Keyboard"}</p>
              <div className="flex items-center gap-2 text-[8px] text-primary/30 tracking-[0.3em] uppercase font-medium">
                <Info size={10} /> {error || `System: ${systemStatus}`}
              </div>
            </div>
          </div>
        </div>

        <div className="text-foreground/10 text-[9px] tracking-[0.8em] uppercase font-bold">{flowers.length} seeds planted</div>
      </div>
      <motion.div className="absolute bottom-0 left-0 h-[2px] bg-primary/20" initial={{ width: "0%" }} animate={{ width: `${(timeLeft / 45) * 100}%` }} />
    </motion.div>
  );
}
