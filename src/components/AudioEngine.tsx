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

  useEffect(() => {
    // Ambient Piano Loop
    bgMusic.current = new Howl({
      src: ['https://cdn.pixabay.com/audio/2022/01/21/audio_167812847c.mp3'],
      loop: true,
      volume: 0.3,
      autoplay: false, // Don't autoplay to avoid browser blocks
      format: ['mp3'],
      html5: true,
      onloaderror: (id, err) => console.error("BG Music Load Error:", err),
    });

    // Chime SFX
    chime.current = new Howl({
      src: ['https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e01d9.mp3'],
      volume: 0.5,
      format: ['mp3']
    });

    // Reveal SFX
    reveal.current = new Howl({
      src: ['https://cdn.pixabay.com/audio/2021/12/10/audio_f523f2f8a8.mp3'],
      volume: 0.6,
      format: ['mp3']
    });

    return () => {
      bgMusic.current?.unload();
      chime.current?.unload();
      reveal.current?.unload();
    };
  }, []);

  const startAudio = () => {
    if (!isMuted && bgMusic.current && !bgMusic.current.playing()) {
      bgMusic.current.play();
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      bgMusic.current?.play();
      bgMusic.current?.fade(0, 0.3, 1000);
    } else {
      bgMusic.current?.fade(0.3, 0, 1000);
      setTimeout(() => bgMusic.current?.pause(), 1000);
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
    if (!isMuted) {
      if (reveal.current?.state() === 'loaded') reveal.current.play();
      else playFallback(660);
    }
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
