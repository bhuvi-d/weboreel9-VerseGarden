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
            <path key={a} d="M50 50 C50 10, 80 10, 50 50" fill={color} transform={`rotate(${a} 50 50)`} opacity="0.9" />
          ))}
          <circle cx="50" cy="50" r="7" fill={secondary} />
        </g>
      );
    case 'rose':
      return (
        <g>
          <circle cx="50" cy="50" r="22" fill={color} opacity="0.35" />
          <circle cx="50" cy="50" r="15" fill={color} opacity="0.65" />
          <circle cx="50" cy="50" r="8"  fill={color} opacity="0.9" />
          <path d="M50 40 Q62 28 72 40 Q62 52 50 40" fill={secondary} opacity="0.9" />
          <circle cx="50" cy="50" r="5" fill={secondary} />
        </g>
      );
    case 'lavender':
      return (
        <g>
          <path d="M50 80 L50 30" stroke={color} strokeWidth="2.5" />
          {[32, 44, 56, 68].map((y) => (
            <ellipse key={y} cx="50" cy={y} rx="5" ry="7" fill={color} opacity="0.85" />
          ))}
        </g>
      );
    case 'sunflower':
      return (
        <g>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
            <path key={a} d="M50 50 Q60 18 50 8 Q40 18 50 50" fill={color} transform={`rotate(${a} 50 50)`} opacity="0.95" />
          ))}
          <circle cx="50" cy="50" r="13" fill={secondary} />
          <circle cx="50" cy="50" r="7" fill="#4a3020" />
        </g>
      );
    case 'tulip':
      return (
        <g>
          <path d="M50 70 Q30 35 50 10 Q70 35 50 70" fill={color} opacity="0.95" />
          <path d="M50 65 Q38 38 50 18 Q62 38 50 65" fill={secondary} opacity="0.6" />
          <path d="M50 70 L50 95" stroke="#4a8c3f" strokeWidth="2.5" />
        </g>
      );
    case 'daisy':
      return (
        <g>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <ellipse key={a} cx="50" cy="28" rx="5" ry="22" fill={color} opacity="0.9" transform={`rotate(${a} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="10" fill={secondary} />
          <circle cx="50" cy="50" r="5" fill="#FFD700" />
        </g>
      );
    default: // wildflower
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="62" cy="50" rx="12" ry="7" fill={color} opacity="0.85" transform={`rotate(${a} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="8" fill={secondary} />
        </g>
      );
  }
};

export default function Flower({ data }: { data: FlowerInstance }) {
  const { color, secondary, glow } = FLOWER_THEME[data.type];
  const swayDuration = useMemo(() => 4 + Math.random() * 2, []);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ 
        scale: data.scale, 
        opacity: 1, 
        y: 0,
        rotate: [data.rotation - 3, data.rotation + 3, data.rotation - 3]
      }}
      transition={{ 
        scale: { type: 'spring', stiffness: 60, damping: 12, delay: data.delay },
        opacity: { duration: 0.4, delay: data.delay },
        rotate: { duration: swayDuration, repeat: Infinity, ease: "easeInOut" }
      }}
      className="absolute pointer-events-none"
      style={{ left: `${data.x}%`, top: `${data.y}%` }}
    >
      <div className="relative flex flex-col items-center">
        {/* Vivid radial glow behind flower */}
        <div
          className="absolute rounded-full blur-2xl"
          style={{
            width: 90, height: 90,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: glow || color,
            opacity: 0.55,
          }}
        />
        
        {/* The Flower SVG */}
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
          <SpeciesSVG species={data.species} color={color} secondary={secondary} />
        </svg>
        
        {/* Label — shows actual spoken words */}
        <motion.div 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: data.delay + 0.7 }}
          className="mt-1 text-center max-w-[120px]"
        >
          <span 
            className="text-[8px] font-serif italic leading-tight block whitespace-normal text-center"
            style={{ color }}
          >
            "{data.text.length > 30 ? data.text.slice(0, 30) + '…' : data.text}"
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
