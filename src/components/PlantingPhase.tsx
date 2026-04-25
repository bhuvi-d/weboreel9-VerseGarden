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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<string>('Ready');
  const [isSoundSowing, setIsSoundSowing] = useState(false);
  const [bursts, setBursts] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  
  const { playChime } = useAudio();
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const handleSow = useCallback((text: string) => {
    const finalWord = text.trim() || AFFIRMATIONS[currentPromptIdx] || "Grown from heart";
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

  // Volume-based "Sound Sowing" fallback for Network Errors
  const startVolumeDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      setIsSoundSowing(true);
      setSystemStatus("Sound-Sowing Active");
      setError(null);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let lastSow = 0;
      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;

        // If volume spike detected (speaking)
        if (average > 30 && Date.now() - lastSow > 3000) {
          handleSow(AFFIRMATIONS[currentPromptIdx]);
          lastSow = Date.now();
        }
        if (audioContextRef.current) requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      setError("Microphone unavailable.");
    }
  };

  const toggleListening = () => {
    if (isListening || isSoundSowing) {
      recognitionRef.current?.stop();
      audioContextRef.current?.close();
      audioContextRef.current = null;
      analyserRef.current = null;
      setIsListening(false);
      setIsSoundSowing(false);
      setSystemStatus("Stopped");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      startVolumeDetection();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSystemStatus("Listening...");
        setError(null);
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) handleSow(event.results[i][0].transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Error:", event.error);
        if (event.error === 'network') {
          setSystemStatus("API Blocked. Switching to Sound-Sowing...");
          startVolumeDetection(); // Switching to local volume detection!
        } else {
          setError(`Mic Issue: ${event.error}`);
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      startVolumeDetection();
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => {
      clearInterval(timer);
      recognitionRef.current?.stop();
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => { if (timeLeft === 0) onComplete(flowers); }, [timeLeft, flowers, onComplete]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative min-h-screen overflow-hidden bg-background">
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
            <div className="text-primary/40 tracking-[0.6em] uppercase text-[9px] font-bold">The First Sowing</div>
            <div className="text-6xl font-serif font-bold text-foreground/20 italic">{timeLeft}s</div>
          </div>

          <div className="min-h-[160px]">
            <AnimatePresence mode="wait">
              {currentPromptIdx < AFFIRMATIONS.length ? (
                <motion.div key={currentPromptIdx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                  <p className="text-foreground/20 text-[10px] tracking-[0.5em] uppercase font-bold">Whisper your intent:</p>
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

        <div className="w-full max-w-2xl text-center space-y-12">
          <div className="min-h-[140px] flex flex-col items-center justify-center space-y-8">
            <AnimatePresence mode="wait">
              {!isListening && !isSoundSowing ? (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && transcript.trim()) handleSow(transcript); }}
                    placeholder={`Type "${AFFIRMATIONS[currentPromptIdx]}" here...`}
                    className="w-full bg-transparent border-b-2 border-primary/20 p-4 text-3xl md:text-5xl font-serif italic text-center text-foreground/80 focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground/10"
                    autoFocus
                  />
                  <p className="mt-4 text-[9px] text-foreground/20 tracking-[0.4em] uppercase font-bold">Press Enter or Speak to Sow</p>
                </motion.div>
              ) : (
                <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                  <p className="text-foreground/50 italic font-serif text-3xl md:text-4xl">
                    {isSoundSowing ? "Voice Detection Active" : "Listening..."}
                  </p>
                  <p className="text-[10px] text-primary/40 uppercase tracking-widest animate-pulse">
                    Just speak to grow the garden
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-10">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl relative ${
                  isListening || isSoundSowing ? 'bg-primary text-background' : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {(isListening || isSoundSowing) && (
                  <motion.div className="absolute inset-0 rounded-full border-2 border-primary" animate={{ scale: [1, 1.5], opacity: [1, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                )}
                {isListening || isSoundSowing ? <MicOff size={24} /> : <Mic size={24} />}
              </motion.button>
              {!isListening && !isSoundSowing && (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSow(transcript)} className="px-10 py-4 bg-foreground text-background rounded-full font-serif text-lg font-medium shadow-xl">Sow Intent</motion.button>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] text-foreground/20 tracking-[0.5em] uppercase font-bold">{isListening || isSoundSowing ? "Whisper your words" : "Speak or Type"}</p>
              <div className="flex items-center gap-2 text-[8px] text-primary/30 tracking-[0.3em] uppercase font-medium">
                <Info size={10} /> {error || `Status: ${systemStatus}`}
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
