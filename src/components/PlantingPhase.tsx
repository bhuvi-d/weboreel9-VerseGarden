'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFlower, FlowerInstance } from '@/lib/flowers';
import Flower from './Flower';
import { useAudio } from './AudioEngine';
import { Mic, MicOff, Sparkles, AlertCircle, Leaf } from 'lucide-react';

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
  const [bursts, setBursts] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  
  const { playChime } = useAudio();
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) handleVoiceInput(text);
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(interim);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => { if (isListening && timeLeft > 0) recognition.start(); };
    recognitionRef.current = recognition;
    // startListening(); // Removed: Browser requires user gesture for microphone access

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => { clearInterval(timer); recognition.stop(); };
  }, []);

  useEffect(() => { if (timeLeft === 0) onComplete(flowers); }, [timeLeft, flowers, onComplete]);

  const startListening = () => { 
    try { 
      recognitionRef.current?.start(); 
      setIsListening(true); 
      setError(null); 
    } catch (e: any) {
      console.error("Speech Start Error:", e);
      if (e.name === 'NotAllowedError') {
        setError("Microphone access denied. Please enable it in browser settings.");
      } else {
        setError("Could not start listening. Please try again.");
      }
      setIsListening(false);
    } 
  };
  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };

  const handleVoiceInput = (text: string) => {
    const newFlower = generateFlower(text);
    setFlowers((prev) => [...prev, newFlower]);
    
    // Add visual burst
    setBursts(prev => [...prev, { id: Date.now(), x: newFlower.x, y: newFlower.y, color: '#c29470' }]);
    setTimeout(() => setBursts(prev => prev.slice(1)), 2000);

    playChime();
    setTranscript('');
    if (currentPromptIdx < AFFIRMATIONS.length) setCurrentPromptIdx(prev => prev + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen overflow-hidden bg-background"
    >
      {/* Soft Light Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#fdfcf0_0%,transparent_100%)] pointer-events-none" />

      {/* Floating Flowers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {flowers.map((flower) => (
            <Flower key={flower.id} data={flower} />
          ))}
          {bursts.map(burst => (
            <FloatingPetal key={burst.id} x={burst.x} y={burst.y} color={burst.color} />
          ))}
        </AnimatePresence>
      </div>

      {/* UI Overlay */}
      <div className="relative z-20 flex flex-col items-center justify-between min-h-screen p-8 pb-32">
        <div className="text-center w-full max-w-4xl space-y-12">
          <div className="space-y-2">
            <motion.div className="text-primary/40 tracking-[0.6em] uppercase text-[9px] font-bold">
              The First Sowing
            </motion.div>
            <motion.div className="text-6xl font-serif font-bold text-foreground/20 italic">
              {timeLeft}s
            </motion.div>
          </div>

          {/* Guided Prompt */}
          <div className="min-h-[160px]">
            <AnimatePresence mode="wait">
              {currentPromptIdx < AFFIRMATIONS.length ? (
                <motion.div
                  key={currentPromptIdx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <p className="text-foreground/20 text-[10px] tracking-[0.5em] uppercase font-bold">Speak into the light:</p>
                  <h2 className="text-5xl md:text-7xl font-serif italic text-foreground/80 leading-tight">
                    "{AFFIRMATIONS[currentPromptIdx]}"
                  </h2>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-primary/60 text-3xl font-serif italic"
                >
                  <Sparkles className="w-10 h-10 mx-auto mb-6 opacity-30" />
                  Your sanctuary is flourishing...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Listening Status */}
        <div className="w-full max-w-2xl text-center space-y-12">
          <div className="min-h-[100px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p 
                key={transcript}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-foreground/50 italic font-serif text-3xl md:text-4xl max-w-xl mx-auto"
              >
                {transcript || "Speak when you are ready..."}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-center gap-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isListening ? stopListening : startListening}
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-2xl relative ${
                isListening 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'bg-foreground text-background'
              }`}
            >
              {isListening && (
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-primary"
                  animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              {isListening ? <MicOff size={40} /> : <Mic size={40} />}
            </motion.button>
            <p className="text-[10px] text-foreground/20 tracking-[0.6em] uppercase font-bold">
              {isListening ? "Listening Active" : "Begin Speaking"}
            </p>
          </div>
        </div>

        <div className="text-foreground/10 text-[9px] tracking-[0.8em] uppercase font-bold">
          {flowers.length} seeds rooted in silence
        </div>
      </div>

      {/* Elegant Progress Line */}
      <motion.div 
        className="absolute bottom-0 left-0 h-[2px] bg-primary/20"
        initial={{ width: "0%" }}
        animate={{ width: `${(timeLeft / 45) * 100}%` }}
        transition={{ duration: 1, ease: "linear" }}
      />
    </motion.div>
  );
}
