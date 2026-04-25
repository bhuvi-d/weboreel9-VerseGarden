'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FLOWER_THEME, FlowerInstance } from '@/lib/flowers';

const SpeciesSVG = ({ species, color, secondary }: { species: string, color: string, secondary: string }) => {
  switch (species) {
    case 'lily':
      return (
        <g>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <path key={a} d="M50 50 C50 10, 80 10, 50 50" fill={color} transform={`rotate(${a} 50 50)`} opacity="0.6" />
          ))}
          <circle cx="50" cy="50" r="5" fill={secondary} />
        </g>
      );
    case 'rose':
      return (
        <g>
          <circle cx="50" cy="50" r="15" fill={color} opacity="0.4" />
          <circle cx="50" cy="50" r="10" fill={color} opacity="0.6" />
          <path d="M50 40 Q60 30 70 40 Q60 50 50 40" fill={secondary} opacity="0.8" />
          <circle cx="50" cy="50" r="5" fill={secondary} />
        </g>
      );
    case 'lavender':
      return (
        <g>
          <path d="M50 50 L50 20" stroke={color} strokeWidth="2" />
          {[25, 35, 45].map((y) => (
            <circle key={y} cx="50" cy={y} r="4" fill={color} opacity="0.7" />
          ))}
        </g>
      );
    case 'sunflower':
      return (
        <g>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
            <path key={a} d="M50 50 Q60 20 50 10 Q40 20 50 50" fill={color} transform={`rotate(${a} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="12" fill="#4a4138" />
        </g>
      );
    case 'tulip':
      return (
        <g>
          <path d="M50 50 Q30 20 50 10 Q70 20 50 50" fill={color} />
          <path d="M50 50 Q40 25 50 15 Q60 25 50 50" fill={secondary} opacity="0.5" />
        </g>
      );
    case 'daisy':
      return (
        <g>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect key={a} x="48" y="20" width="4" height="30" rx="2" fill={secondary} transform={`rotate(${a} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="8" fill={color} />
        </g>
      );
    default: // wildflower
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx="60" cy="50" r="10" fill={color} opacity="0.5" transform={`rotate(${a} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="6" fill={secondary} />
        </g>
      );
  }
};

export default function Flower({ data }: { data: FlowerInstance }) {
  const { color, secondary } = FLOWER_THEME[data.type];
  
  // Stabilize random values
  const swayDuration = useMemo(() => 4 + Math.random() * 2, []);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ 
        scale: data.scale, 
        opacity: 1, 
        y: 0,
        rotate: [data.rotation - 2, data.rotation + 2, data.rotation - 2]
      }}
      transition={{ 
        scale: { type: 'spring', stiffness: 50, damping: 15, delay: data.delay },
        rotate: { duration: swayDuration, repeat: Infinity, ease: "easeInOut" }
      }}
      className="absolute pointer-events-none"
      style={{ left: `${data.x}%`, top: `${data.y}%` }}
    >
      <div className="relative flex flex-col items-center group">
        {/* Soft Sunlight Glow */}
        <div 
          className="absolute inset-0 blur-[40px] opacity-20 scale-150" 
          style={{ backgroundColor: color }}
        />
        
        {/* The Flower */}
        <svg width="100" height="100" viewBox="0 0 100 100" className="drop-shadow-sm">
          <SpeciesSVG species={data.species} color={color} secondary={secondary} />
        </svg>
        
        {/* Elegant Label */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: data.delay + 0.8 }}
          className="mt-2 text-center"
        >
          <span className="text-[10px] font-serif italic tracking-[0.3em] uppercase text-foreground/30 whitespace-nowrap">
            {data.text}
          </span>
          <div className="w-8 h-[1px] bg-primary/20 mx-auto mt-1" />
        </motion.div>
      </div>
    </motion.div>
  );
}
