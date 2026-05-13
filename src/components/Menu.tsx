import React from 'react';
import { motion } from 'motion/react';
import { Shield, Zap, Compass, Share2, PlayCircle, Info } from 'lucide-react';
import { LEVELS } from '../game/constants';

interface MenuProps {
  onStart: (levelIdx: number) => void;
}

const Menu: React.FC<MenuProps> = ({ onStart }) => {
  const [showHowTo, setShowHowTo] = React.useState(false);

  return (
    <div className="fixed inset-0 bg-[#00050A] z-[200] flex flex-col items-center justify-center font-mono overflow-hidden deep-sea-bg">
      {/* CRT Overlay */}
      <div className="absolute inset-0 crt-overlay opacity-30 select-none" />
      <div className="absolute inset-0 vignette opacity-60 pointer-events-none" />
      <div className="absolute inset-0 marine-snow pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 p-8 w-full"
      >
        {!showHowTo && (
          <div className="flex flex-col gap-8 max-w-5xl mx-auto mb-16">
            <div className="text-left mb-4 px-2">
              <span className="text-[10px] text-[#00FFFF]/40 tracking-widest uppercase">Select Mission Profile:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {LEVELS.map((lvl, idx) => (
                <motion.button
                  key={lvl.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.05, borderColor: lvl.color }}
                  onClick={() => onStart(idx)}
                  className="bg-black/40 border border-[#004466] p-6 text-left group hover:bg-black/60 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                    <Shield className="w-8 h-8" style={{ color: lvl.color }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 tracking-tighter" style={{ color: lvl.color }}>{lvl.name}</h3>
                  <p className="text-[10px] text-white/40 leading-relaxed mb-4">{lvl.description}</p>
                  <div className="flex justify-between items-center mt-4 border-t border-[#004466] pt-4">
                    <span className="text-[9px] text-[#00FFFF]">MISSION_{lvl.id}</span>
                    <div className="flex items-center gap-1">
                       <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-all">INITIALIZE</span>
                       <PlayCircle className="w-5 h-5 text-[#00FFFF]" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <motion.h1 
          animate={{ opacity: [0.8, 1, 0.8], textShadow: ["0 0 5px #00FFFF", "0 0 20px #00FFFF", "0 0 5px #00FFFF"] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-7xl font-bold tracking-[0.3em] text-[#00FFFF] mb-2 font-display"
        >
          DEEP SEAS
        </motion.h1>
        <p className="text-[#00FFFF]/50 text-xs tracking-[0.5em] mb-12 uppercase">Deep Sea Base Building & Survival</p>

        {!showHowTo ? (
          <div className="flex flex-col gap-8 max-w-5xl mx-auto">
            <div className="flex justify-center gap-4 mt-6">
              <button 
                onClick={() => setShowHowTo(true)}
                className="flex items-center gap-2 px-8 py-3 border border-[#00FFFF]/30 text-[10px] hover:bg-[#00FFFF]/10 transition-all cursor-pointer uppercase tracking-[0.3em] glow-cyan"
              >
                <Info className="w-4 h-4" /> Operations Manual
              </button>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl w-full text-left bg-black/90 border border-[#00FFFF]/30 p-10 relative backdrop-blur-xl shadow-[0_0_100px_rgba(0,0,0,1)]"
          >
            <div className="absolute top-4 right-4 text-[10px] text-[#00FFFF]/30">DOC_REF: ABYSS_PROTOCOL_V4</div>
            
            <h2 className="text-3xl font-bold text-[#00FFFF] mb-10 flex items-center gap-4 font-display italic tracking-tight">
              <div className="w-10 h-[2px] bg-[#00FFFF]" /> 
              HOW TO PLAY
              <div className="flex-1 h-[1px] bg-[#004466] ml-4" />
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-10">
                <div className="relative group">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-8 h-8 rounded-full border border-gold flex items-center justify-center">
                      <Zap className="w-4 h-4 text-gold" />
                    </div>
                    <h4 className="font-bold text-gold tracking-widest text-sm uppercase">1. Power Up</h4>
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/70 pl-12 border-l border-[#004466]">
                    Find <span className="text-gold">Yellow Vents</span> in the dark. Connect them to your Base with cables to get <span className="text-gold">Power</span>.
                  </p>
                  <div className="absolute -left-2 top-0 bottom-0 w-[1px] bg-gold/30 hidden group-hover:block" />
                </div>

                <div className="group relative">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-8 h-8 rounded-full border border-cyan flex items-center justify-center">
                      <Compass className="w-4 h-4 text-cyan" />
                    </div>
                    <h4 className="font-bold text-cyan tracking-widest text-sm uppercase">2. Explore</h4>
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/70 pl-12 border-l border-[#004466]">
                    <span className="text-cyan">Double-Click</span> anywhere in the dark to send a Sonar Ping. This reveals the map so you can see where to build.
                  </p>
                  {/* Visual: Sonar Ripple */}
                  <div className="mt-4 pl-12">
                    <div className="relative w-16 h-8 border border-cyan/20 overflow-hidden">
                       <motion.div 
                         animate={{ x: [0, 64], opacity: [0, 1, 0] }}
                         transition={{ duration: 2, repeat: Infinity }}
                         className="absolute top-0 bottom-0 w-4 bg-cyan/10" 
                       />
                       <div className="absolute inset-0 flex items-center justify-center text-[7px] text-cyan/40">SCANNING...</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <div className="group relative">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center">
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-bold text-white tracking-widest text-sm uppercase">3. Connect</h4>
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/70 pl-12 border-l border-[#004466]">
                    Click and drag from your Base to a revealed area to lay <span className="text-cyan">Cables</span>. Following the faint dotted lines saves you money!
                  </p>
                  {/* Visual: MST Nodes */}
                  <div className="mt-4 pl-12 flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-cyan" />
                    <div className="w-12 h-[1px] bg-white/20 self-center border-t border-dashed" />
                    <div className="w-2 h-2 rounded-full bg-white/20 border border-white/40" />
                  </div>
                </div>

                <div className="group relative">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-8 h-8 rounded-full border border-magenta flex items-center justify-center">
                      <Shield className="w-4 h-4 text-magenta" />
                    </div>
                    <h4 className="font-bold text-magenta tracking-widest text-sm uppercase">4. Defend</h4>
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/70 pl-12 border-l border-[#004466]">
                    <span className="text-magenta">Purple Cracks</span> will grow and drain your power. Press <span className="text-white bg-white/10 px-1 rounded">SPACE</span> to switch to Repair Mode, then click cracks to fix them.
                  </p>
                  {/* Visual: Crack Grid */}
                  <div className="mt-4 pl-12 grid grid-cols-4 gap-1 w-16">
                     <div className="w-3 h-3 bg-magenta/20 border border-magenta/40" />
                     <div className="w-3 h-3 bg-magenta" />
                     <div className="w-3 h-3 bg-magenta/20 border border-magenta/40" />
                     <div className="w-3 h-3 bg-magenta" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-between items-center pt-8 border-t border-[#004466]">
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Build Mode [SPACE] Toggle Repair Mode</div>
              <button 
                onClick={() => setShowHowTo(false)}
                className="px-10 py-3 bg-[#00FFFF] text-[#00050A] text-xs font-bold hover:scale-105 transition-all cursor-pointer uppercase tracking-tighter shadow-[0_0_20px_rgba(0,255,255,0.4)]"
              >
                Acknowledge & Return
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* FOOTER */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-30 text-[9px] tracking-tighter">
        <span>ENCODING: UTF-8 // KERNEL: ABYSS-V2</span>
        <span>(C) 2026 DEEPSEA BRUTALISM SYSTEMS</span>
      </div>
    </div>
  );
};

export default Menu;
