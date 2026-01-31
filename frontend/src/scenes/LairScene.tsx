import { motion } from 'framer-motion';
import { useDirectorStore } from '../state/directorStore';
import { SCENE_LABELS, SCENE_TAGLINES } from '../utils/scenes';

const LairScene = () => {
  const reducedMotion = useDirectorStore((s) => s.reducedMotion);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-black via-[#120b16] to-[#050507]">
      <div className="noise vignette absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(90,29,43,0.35),transparent_55%)]" />
      <motion.div
        className="absolute left-[55%] top-[25%] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(120,20,30,0.35),transparent_70%)] blur-3xl"
        animate={reducedMotion ? {} : { scale: [1, 1.1, 0.95, 1], opacity: [0.4, 0.7, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[12%] left-[20%] h-52 w-80 rounded-[60px] border border-burgundy/30 bg-black/60"
        animate={reducedMotion ? {} : { y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[20%] top-[20%] h-40 w-40 rounded-full border border-brass/30"
        animate={reducedMotion ? {} : { opacity: [0.2, 0.6, 0.25] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 mix-blend-screen"
        animate={reducedMotion ? {} : { opacity: [0.05, 0.12, 0.04], x: [0, -6, 4, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 1px, transparent 2px, transparent 6px)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm uppercase tracking-[0.4em] text-brass">{SCENE_LABELS.LAIR}</div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-fog">{SCENE_TAGLINES.LAIR}</div>
        </div>
      </div>
    </div>
  );
};

export default LairScene;
