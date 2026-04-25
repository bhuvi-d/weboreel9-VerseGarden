'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAudio } from './AudioEngine';
import { Volume2, VolumeX, Sparkles, Leaf } from 'lucide-react';

const Petal = ({ delay }: { delay: number }) => {
  // Use useMemo to generate random values only once on the client
  // However, even this can cause hydration issues if it runs during the first render.
  // The safest way is to generate these values in useEffect or use a mounted flag.
  const config = useMemo(() => ({
    startX: Math.random() * 100 + "%",
    endX: (Math.random() * 100 - 50) + "%",
    duration: 10 + Math.random() * 10,
    size: 12 + Math.random() * 12
  }), []);

  return (
    <motion.div
      initial={{ y: -20, x: config.startX, opacity: 0, rotate: 0 }}
      animate={{ 
        y: "110vh", 
        x: config.endX, 
        opacity: [0, 0.4, 0],
        rotate: 360 
      }}
      transition={{ duration: config.duration, repeat: Infinity, delay, ease: "linear" }}
      className="absolute pointer-events-none text-primary/20"
    >
      <Leaf size={config.size} />
    </motion.div>
  );
};

export default function Hero({ onStart }: { onStart: () => void }) {
  const { isMuted, toggleMute, startAudio } = useAudio();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden bg-background"
    >
      {/* Drifting Petals - Only render on client to avoid hydration mismatch */}
      <div className="absolute inset-0 pointer-events-none">
        {mounted && Array.from({ length: 15 }).map((_, i) => (
          <Petal key={i} delay={i * 2} />
        ))}
      </div>

      {/* Warm Sunlight Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-primary/20 blur-[180px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent/20 blur-[150px] rounded-full" />
      </div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 space-y-12"
      >
        <div className="flex flex-col items-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-primary/60 tracking-[0.6em] uppercase text-[10px] font-bold"
          >
            A Sanctuary of Growth
          </motion.div>
          <div className="h-[1px] w-12 bg-primary/20" />
        </div>
        
        <h1 className="text-8xl md:text-[14rem] font-serif font-bold tracking-tighter leading-none text-foreground/90 selection:bg-primary/10">
          Verse<br/>Garden
        </h1>
        
        <p className="text-xl md:text-3xl font-light text-foreground/40 max-w-2xl mx-auto font-serif italic leading-relaxed">
          The earth remembers the kindness <br/> in your voice.
        </p>

        <div className="flex flex-col items-center gap-10 pt-10">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              startAudio();
              onStart();
            }}
            className="px-20 py-6 bg-foreground text-background rounded-full font-serif text-xl font-medium shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all duration-500"
          >
            Begin Sowing
          </motion.button>

          <button 
            onClick={toggleMute}
            className="flex items-center gap-3 text-foreground/20 hover:text-foreground/40 transition-colors text-[10px] uppercase tracking-[0.5em] font-bold"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {isMuted ? 'Sound Disabled' : 'Sound Enabled'}
          </button>
        </div>
      </motion.div>

      <div className="absolute bottom-16 text-foreground/10 text-[9px] tracking-[0.8em] uppercase font-bold">
        Step into the light
      </div>
    </motion.div>
  );
}
