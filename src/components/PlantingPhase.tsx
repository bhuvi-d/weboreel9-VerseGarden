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
  const [systemStatus, setSystemStatus] = useState<string>('Ready');
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

    recognition.onstart = () => {
      console.log("Speech: Listening started");
      setIsListening(true);
      setError(null);
      setSystemStatus("Listening...");
    };

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

    recognition.onerror = (event: any) => {
      console.error("Speech Error:", event.error);
      const errMap: Record<string, string> = {
        'not-allowed': "Microphone access blocked. Check browser settings.",
        'no-speech': "No voice detected. Please speak louder.",
        'network': "Network issues. Check connection.",
        'service-not-allowed': "Speech service not allowed by browser.",
        'aborted': "Listening stopped."
      };
      setSystemStatus(`Error: ${event.error}`);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(errMap[event.error] || `Mic Error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log("Speech: Ended");
      if (isListening && timeLeft > 0) {
        setSystemStatus("Restarting...");
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setSystemStatus("Idle");
        setIsListening(false);
      }
    };

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

  const startListening = async () => { 
    console.log("Attempting to start listening (Permission First)...");
    setTranscript('');
    setError(null);
    setSystemStatus("Requesting Permission...");

    try { 
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      setSystemStatus("Permission Granted. Starting...");

      if (!recognitionRef.current) {
        setError("Speech recognition not initialized. Please refresh.");
        return;
      }

      try {
        recognitionRef.current.start(); 
        setIsListening(true); 
      } catch (e: any) {
        if (e.name === 'InvalidStateError') {
          setSystemStatus("Already Listening.");
          setIsListening(true);
        } else {
          throw e;
        }
      }
    } catch (e: any) {
      console.error("Mic/Speech Start Error:", e);
      setSystemStatus(`Failed: ${e.name}`);
      if (e.name === 'NotAllowedError' || e.error === 'not-allowed' || e.name === 'PermissionDeniedError') {
        setError("Microphone access denied. Please click the 'Lock' icon in your browser address bar and set Microphone to 'Allow'.");
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setError("No microphone found. Please connect a mic and try again.");
      } else {
        setError("Could not start listening. Please ensure you are on a secure (HTTPS) connection.");
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

        {/* Input Area (Multi-modal: Voice or Typing) */}
        <div className="w-full max-w-2xl text-center space-y-12">
          <div className="min-h-[140px] flex flex-col items-center justify-center space-y-8">
            <AnimatePresence mode="wait">
              {!isListening ? (
                <motion.div 
                  key="typing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full"
                >
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && transcript.trim()) {
                        handleVoiceInput(transcript);
                      }
                    }}
                    placeholder="Type your affirmation here..."
                    className="w-full bg-transparent border-b-2 border-primary/20 p-4 text-3xl md:text-5xl font-serif italic text-center text-foreground/80 focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground/10"
                    autoFocus
                  />
                  <p className="mt-4 text-[9px] text-foreground/20 tracking-[0.4em] uppercase font-bold">
                    Press Enter to Sow
                  </p>
                </motion.div>
              ) : (
                <motion.p 
                  key="listening"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-foreground/50 italic font-serif text-3xl md:text-4xl max-w-xl mx-auto"
                >
                  {transcript || "Listening to your heart..."}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-10">
              {/* Voice Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isListening ? stopListening : startListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl relative ${
                  isListening 
                  ? 'bg-primary text-background' 
                  : 'bg-primary/10 text-primary border border-primary/20'
                }`}
                title="Sow with Voice"
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

              {/* Manual Sow Button */}
              {!isListening && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => transcript.trim() && handleVoiceInput(transcript)}
                  className="px-10 py-4 bg-foreground text-background rounded-full font-serif text-lg font-medium shadow-xl"
                >
                  Sow Intent
                </motion.button>
              )}
            </div>
            
            <p className="text-[10px] text-foreground/20 tracking-[0.5em] uppercase font-bold">
              {isListening ? "Whisper your words" : "Type or speak your intent"}
            </p>
            <div className="text-[8px] text-primary/30 tracking-[0.3em] uppercase font-medium">
              System: {systemStatus}
            </div>
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
