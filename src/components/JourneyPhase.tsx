'use client';

import { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { FlowerInstance } from '@/lib/flowers';
import Flower from './Flower';
import { useAudio } from './AudioEngine';
import { ChevronDown, MousePointer2 } from 'lucide-react';

const SECTIONS = [
  { id: 'hope', title: 'Belief', sub: 'I believe in the future.', color: 'from-[#8d9965]/10' },
  { id: 'peace', title: 'Rest', sub: 'I am at rest and peace.', color: 'from-[#c29470]/10' },
  { id: 'love', title: 'Worthy', sub: 'I am worthy of love.', color: 'from-[#e5d5c5]/10' },
  { id: 'courage', title: 'Brave', sub: 'I am brave and strong.', color: 'from-[#8d9965]/10' },
  { id: 'gratitude', title: 'Gratitude', sub: 'I am thankful for life.', color: 'from-[#c29470]/10' },
  { id: 'dreams', title: 'Soar', sub: 'I can fly higher.', color: 'from-[#e5d5c5]/10' },
];

export default function JourneyPhase({ flowers, onRestart }: { flowers: FlowerInstance[], onRestart: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { playReveal } = useAudio();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div ref={containerRef} className="relative bg-background min-h-screen text-foreground">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div 
          style={{ opacity: useTransform(smoothProgress, [0, 1], [0.3, 0.8]) }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#e5d5c5_0%,transparent_70%)]"
        />
      </div>

      {/* Intro Scroll Prompt */}
      <div className="h-screen flex flex-col items-center justify-center text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5 }}
          className="space-y-6"
        >
          <h2 className="text-6xl md:text-8xl font-serif italic text-foreground/80 font-bold tracking-tight">The Earth Remembers</h2>
          <p className="text-foreground/40 tracking-[0.5em] uppercase text-xs">A path grown from your voice</p>
          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="pt-16 flex flex-col items-center gap-3 text-primary/80"
          >
            <ChevronDown size={40} strokeWidth={1} />
            <span className="text-[10px] uppercase tracking-[0.4em] font-medium">Begin Wandering</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section, idx) => (
        <section 
          key={section.id} 
          className="relative min-h-screen flex items-center justify-center p-10 overflow-hidden"
        >
          {/* Section Glow */}
          <div className={`absolute inset-0 bg-gradient-to-b ${section.color} to-transparent opacity-30`} />
          
          <div className={`max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 gap-20 items-center ${idx % 2 === 0 ? '' : 'md:flex-row-reverse'}`}>
            
            {/* Text Side */}
            <motion.div
              initial={{ x: idx % 2 === 0 ? -50 : 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              onViewportEnter={() => playReveal()}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              className={`z-10 text-center md:text-left ${idx % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}
            >
              <span className="text-accent tracking-[0.6em] uppercase text-[10px] mb-8 block font-bold">
                Chapter 0{idx + 1}
              </span>
              <h2 className="text-6xl md:text-9xl font-serif font-bold mb-10 text-glow text-foreground/90">
                {section.title}
              </h2>
              <div className="h-[1px] w-24 bg-primary/40 mb-10 mx-auto md:mx-0" />
              <p className="text-2xl md:text-5xl font-serif italic text-foreground/60 leading-[1.4]">
                "{section.sub}"
              </p>
              
              <div className="mt-16 flex items-center gap-4 text-foreground/20 justify-center md:justify-start">
                <MousePointer2 size={16} />
                <span className="text-[10px] uppercase tracking-[0.4em]">Drift lower</span>
              </div>
            </motion.div>

            {/* Plant Side */}
            <div className={`relative h-[500px] md:h-[700px] flex items-center justify-center ${idx % 2 === 0 ? 'md:order-2' : 'md:order-1'}`}>
              <motion.div 
                className="absolute inset-0 pointer-events-none"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 2, ease: "easeOut" }}
              >
                {flowers.slice(idx, idx + 1).map((flower) => (
                  <Flower 
                    key={`${section.id}-${flower.id}`} 
                    data={{
                      ...flower, 
                      x: 50, 
                      y: 50, 
                      scale: 3, 
                      delay: 0.1 
                    }} 
                  />
                ))}
              </motion.div>
              
              {/* Background ambient plant glow */}
              <div className={`w-80 h-80 blur-[150px] opacity-10 rounded-full bg-gradient-to-br from-primary to-transparent`} />
            </div>
          </div>
        </section>
      ))}

      {/* Final Field of All Flowers (Rotating Flowers Finale) */}
      <section className="relative min-h-[150vh] flex flex-col items-center justify-center p-10 overflow-hidden">
        {/* Slow Rotating Background Flowers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {flowers.map((flower, i) => (
            <motion.div
              key={`final-wrap-${flower.id}`}
              className="absolute"
              style={{
                left: `${(i * 25) % 80 + 10}%`,
                top: `${(i * 15) % 80 + 10}%`,
              }}
              animate={{ 
                rotate: 360,
                y: [0, -20, 0],
                x: [0, 10, 0]
              }}
              transition={{ 
                rotate: { duration: 20 + (i * 2), repeat: Infinity, ease: "linear" },
                y: { duration: 5 + i, repeat: Infinity, ease: "easeInOut" },
                x: { duration: 7 + i, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <Flower 
                data={{
                  ...flower, 
                  x: 0, 
                  y: 0,
                  scale: 1.5 + (i % 2) 
                }} 
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          className="relative z-10 text-center space-y-20 max-w-5xl"
        >
          <div className="space-y-8">
            <h2 className="text-7xl md:text-[11rem] font-serif font-bold text-foreground/90 leading-none tracking-tighter">
              A Living <br/>Legacy.
            </h2>
            <p className="text-2xl md:text-3xl text-foreground/50 font-serif italic max-w-2xl mx-auto border-t border-primary/20 pt-10">
              The words you spoke have seeded this sanctuary. <br/>May they grow within you as they have here.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-10 pt-10">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRestart}
              className="px-14 py-6 bg-accent text-white rounded-full font-serif text-xl shadow-xl hover:shadow-accent/40 transition-all"
            >
              Sow New Seeds
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.print()}
              className="px-14 py-6 border-2 border-primary text-primary rounded-full font-serif text-xl font-bold hover:bg-primary hover:text-white transition-all"
            >
              Preserve Sanctuary
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="h-60 flex flex-col items-center justify-center text-foreground/30 text-[10px] tracking-[0.5em] uppercase gap-6 bg-secondary/10">
        <div className="flex gap-12 font-medium">
          <span>Grounded</span>
          <span>Peaceful</span>
          <span>Growing</span>
        </div>
        <div className="italic">VerseGarden &copy; 2026 • Grown with Intent</div>
      </footer>
    </div>
  );
}
