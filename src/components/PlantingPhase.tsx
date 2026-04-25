'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateFlower, FlowerInstance } from '@/lib/flowers';
import Flower from './Flower';
import { useAudio } from './AudioEngine';
import { Mic, MicOff, Sparkles, Leaf } from 'lucide-react';

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
  const [bursts, setBursts] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  
  const { playChime } = useAudio();
  const recognitionRef = useRef<any>(null);
  const handlerRef = useRef<(text: string) => void>(() => {});

  // handleVoiceInput with latest state access
  const handleVoiceInput = useCallback((text: string) => {
    if (!text.trim()) return;
    
    try {
      const newFlower = generateFlower(text);
      setFlowers(prev => [...prev, newFlower]);
      
      const burstId = Date.now();
      setBursts(prev => [...prev, { id: burstId, x: newFlower.x, y: newFlower.y, color: '#c29470' }]);
      setTimeout(() => {
        setBursts(prev => prev.filter(b => b.id !== burstId));
      }, 2000);

      playChime();
      setTranscript('');
      setCurrentPromptIdx(prev => Math.min(prev + 1, AFFIRMATIONS.length));
    } catch (e) {
      console.error("Sow Error:", e);
    }
  }, [playChime]);

  // Keep the ref updated for the speech handler closure
  useEffect(() => {
    handlerRef.current = handleVoiceInput;
  }, [handleVoiceInput]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice capture not supported in this browser.");
      return;
    }

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
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) handlerRef.current(text);
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Error:", event.error);
      setSystemStatus(`Error: ${event.error}`);
      if (event.error === 'not-allowed') {
        setError("Microphone access denied.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening && timeLeft > 0) {
        try { recognition.start(); } catch (e) {}
      } else {
        setIsListening(false);
        setSystemStatus("Idle");
      }
    };

    recognitionRef.current = recognition;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      try { recognition.stop(); } catch (e) {}
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0) onComplete(flowers);
  }, [timeLeft, flowers, onComplete]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Start failed:", e);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen overflow-hidden bg-background"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#fdfcf0_0%,transparent_100%)] pointer-events-none" />

      {/* Garden Field */}
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

      <div className="relative z-20 flex flex-col items-center justify-between min-h-screen p-8 pb-32">
        <div className="text-center w-full max-w-4xl space-y-12">
          <div className="space-y-2">
            <div className="text-primary/40 tracking-[0.6em] uppercase text-[9px] font-bold">
              The First Sowing
            </div>
            <div className="text-6xl font-serif font-bold text-foreground/20 italic">
              {timeLeft}s
            </div>
          </div>

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
                  <p className="text-foreground/20 text-[10px] tracking-[0.5em] uppercase font-bold">Your Intent:</p>
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

        {/* Input Area */}
        <div className="w-full max-w-2xl text-center space-y-12">
          <div className="min-h-[140px] flex flex-col items-center justify-center space-y-8">
            <AnimatePresence mode="wait">
              {!isListening ? (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && transcript.trim()) {
                        handleVoiceInput(transcript);
                      }
                    }}
                    placeholder="Type or wait for voice..."
                    className="w-full bg-transparent border-b-2 border-primary/20 p-4 text-3xl md:text-5xl font-serif italic text-center text-foreground/80 focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground/10"
                    autoFocus
                  />
                  <p className="mt-4 text-[9px] text-foreground/20 tracking-[0.4em] uppercase font-bold">
                    Press Enter to Sow
                  </p>
                </motion.div>
              ) : (
                <motion.p key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-foreground/50 italic font-serif text-3xl md:text-4xl max-w-xl mx-auto">
                  {transcript || "Listening..."}
                </motion.p>
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
                  isListening ? 'bg-primary text-background' : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {isListening && (
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </motion.button>

              {!isListening && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => transcript.trim() && handleVoiceInput(transcript)}
                  className="px-10 py-4 bg-foreground text-background rounded-full font-serif text-lg font-medium shadow-xl"
                >
                  Sow Seed
                </motion.button>
              )}
            </div>
            
            <p className="text-[10px] text-foreground/20 tracking-[0.5em] uppercase font-bold">
              {isListening ? "Whisper into the light" : "Type or click mic to speak"}
            </p>
            <div className="text-[8px] text-primary/30 tracking-[0.3em] uppercase font-medium">
              {error || `Status: ${systemStatus}`}
            </div>
          </div>
        </div>

        <div className="text-foreground/10 text-[9px] tracking-[0.8em] uppercase font-bold">
          {flowers.length} seeds planted
        </div>
      </div>

      <motion.div 
        className="absolute bottom-0 left-0 h-[2px] bg-primary/20"
        initial={{ width: "0%" }}
        animate={{ width: `${(timeLeft / 45) * 100}%` }}
      />
    </motion.div>
  );
}
