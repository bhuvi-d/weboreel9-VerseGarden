'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Hero from '@/components/Hero';
import PlantingPhase from '@/components/PlantingPhase';
import JourneyPhase from '@/components/JourneyPhase';
import AudioEngine from '@/components/AudioEngine';
import { FlowerInstance } from '@/lib/flowers';

export type AppState = 'START' | 'PLANTING' | 'JOURNEY' | 'END';

export default function Home() {
  const [state, setState] = useState<AppState>('START');
  const [flowers, setFlowers] = useState<FlowerInstance[]>([]);

  const handleStart = () => setState('PLANTING');
  
  const handleFinishPlanting = (generatedFlowers: FlowerInstance[]) => {
    setFlowers(generatedFlowers);
    setState('JOURNEY');
  };

  const handleRestart = () => {
    setFlowers([]);
    setState('START');
  };

  return (
    <AudioEngine>
      <main className="relative min-h-screen">
        <AnimatePresence mode="wait">
          {state === 'START' && (
            <Hero key="hero" onStart={handleStart} />
          )}
          
          {state === 'PLANTING' && (
            <PlantingPhase 
              key="planting" 
              onComplete={handleFinishPlanting} 
            />
          )}

          {state === 'JOURNEY' && (
            <JourneyPhase 
              key="journey" 
              flowers={flowers} 
              onRestart={handleRestart}
            />
          )}
        </AnimatePresence>
      </main>
    </AudioEngine>
  );
}
