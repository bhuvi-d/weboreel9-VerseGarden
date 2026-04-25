'use client';

import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { Howl, Howler } from 'howler';

const AudioContext = createContext<{
  isMuted: boolean;
  toggleMute: () => void;
  playChime: () => void;
  playReveal: () => void;
  startAudio: () => void;
}>({
  isMuted: false,
  toggleMute: () => {},
  playChime: () => {},
  playReveal: () => {},
  startAudio: () => {},
});

export const useAudio = () => useContext(AudioContext);

export default function AudioEngine({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const bgMusic = useRef<Howl | null>(null);
  const chime = useRef<Howl | null>(null);
  const reveal = useRef<Howl | null>(null);
  const synthRef = useRef<any>(null);

  useEffect(() => {
    // Ambient Piano Loop - Updated URL to a potentially more stable one
    bgMusic.current = new Howl({
      src: ['https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3'], // Generic stable test link
      loop: true,
      volume: 0.2,
      autoplay: false,
      format: ['mp3'],
      html5: true,
      onloaderror: (id, err) => {
        console.error("BG Music Load Error:", err);
        // If external audio fails, we stay silent or use synth
      },
    });

    // Chime SFX
    chime.current = new Howl({
      src: ['https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e01d9.mp3'],
      volume: 0.5,
      format: ['mp3']
    });

    return () => {
      bgMusic.current?.unload();
      chime.current?.unload();
      stopSynth();
    };
  }, []);

  const startSynth = () => {
    if (synthRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      // Create a simple low-pass filtered pad
      const createOsc = (freq: number) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        g.gain.setValueAtTime(0.02, audioCtx.currentTime);
        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        return osc;
      };

      const oscs = [createOsc(110), createOsc(164.81), createOsc(220)]; // A minor triad
      masterGain.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 2);
      
      synthRef.current = { audioCtx, masterGain, oscs };
    } catch (e) {}
  };

  const stopSynth = () => {
    if (synthRef.current) {
      const { masterGain, oscs } = synthRef.current;
      masterGain.gain.exponentialRampToValueAtTime(0.001, synthRef.current.audioCtx.currentTime + 1);
      setTimeout(() => {
        oscs.forEach((o: any) => o.stop());
        synthRef.current = null;
      }, 1100);
    }
  };

  const startAudio = () => {
    if (isMuted) return;
    
    // Try BG Music
    if (bgMusic.current && bgMusic.current.state() === 'loaded') {
      bgMusic.current.play();
    } else {
      // Fallback to Procedural Synth
      startSynth();
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      if (bgMusic.current?.state() === 'loaded') {
        bgMusic.current.play();
        bgMusic.current.fade(0, 0.2, 1000);
      } else {
        startSynth();
      }
    } else {
      bgMusic.current?.fade(0.2, 0, 1000);
      setTimeout(() => bgMusic.current?.pause(), 1000);
      stopSynth();
    }
    setIsMuted(!isMuted);
  };

  const playChime = () => {
    if (!isMuted) {
      if (chime.current?.state() === 'loaded') chime.current.play();
      else playFallback(880);
    }
  };

  const playReveal = () => {
    if (!isMuted) playFallback(660);
  };

  const playFallback = (freq: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1);
    } catch (e) {}
  };

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, playChime, playReveal, startAudio }}>
      {children}
    </AudioContext.Provider>
  );
}
