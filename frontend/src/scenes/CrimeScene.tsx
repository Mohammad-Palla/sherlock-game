import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';
import { useDirectorStore } from '../state/directorStore';

const CrimeScene = () => {
  const evidence = useDirectorStore((s) => s.evidence);
  const flash = useDirectorStore((s) => s.flash);
  const clearFlash = useDirectorStore((s) => s.clearFlash);
  const reducedMotion = useDirectorStore((s) => s.reducedMotion);
  const controls = useAnimation();

  useEffect(() => {
    if (!flash || reducedMotion) return;
    controls
      .start({ x: [0, -8, 6, -4, 0], transition: { duration: 0.5 } })
      .then(() => clearFlash());
  }, [flash, reducedMotion, controls, clearFlash]);

  useEffect(() => {
    if (flash && reducedMotion) {
      const timer = window.setTimeout(() => clearFlash(), 300);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [flash, reducedMotion, clearFlash]);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden bg-gradient-to-br from-black via-charcoal to-ink"
      animate={controls}
    >
      <div className="noise vignette absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(192,165,107,0.2),transparent_55%)]" />
      <div
        className={`absolute left-[12%] top-[20%] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,240,200,0.4),transparent_70%)] blur-2xl ${
          reducedMotion ? '' : 'animate-flicker'
        }`}
      />

      <motion.div
        className="absolute bottom-[18%] left-[38%] h-24 w-40 rounded-full bg-[radial-gradient(circle,rgba(90,29,43,0.7),transparent_70%)] opacity-70"
        animate={reducedMotion ? {} : { scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute bottom-[18%] left-[40%] h-36 w-48 rotate-6 rounded-full border border-fog/20 bg-black/40" />
      <div className="absolute bottom-[18%] left-[44%] h-28 w-32 -rotate-6 rounded-full border border-fog/10" />

      <motion.div
        className="absolute right-[15%] top-[26%] h-72 w-44 rounded-[80px] border border-fog/20 bg-gradient-to-b from-black/60 to-black/10"
        animate={reducedMotion ? {} : { opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {evidence.map((item) => (
        <motion.div
          key={item.id}
          className="absolute rounded-full border border-brass/60 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-brass shadow-glow"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
          initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          {item.title}
        </motion.div>
      ))}

      {flash ? (
        <motion.div
          className="absolute inset-0 bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.6, 0.2, 0] }}
          transition={{ duration: 0.5 }}
        />
      ) : null}
      {flash ? (
        <div className="absolute inset-0">
          {Array.from({ length: 12 }).map((_, index) => (
            <motion.div
              key={`particle-${index}`}
              className="absolute h-2 w-2 rounded-full bg-brass/60"
              style={{ left: `${40 + Math.random() * 20}%`, top: `${45 + Math.random() * 20}%` }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0.9, 0], scale: [1.2, 0.2], y: [-10, 40] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </div>
      ) : null}
    </motion.div>
  );
};

export default CrimeScene;
