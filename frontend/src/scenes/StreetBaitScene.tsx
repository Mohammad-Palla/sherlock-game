import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';
import { useDirectorStore } from '../state/directorStore';

const StreetBaitScene = () => {
  const reducedMotion = useDirectorStore((s) => s.reducedMotion);
  const misdirected = useDirectorStore((s) => s.misdirected);
  const clearMisdirect = useDirectorStore((s) => s.clearMisdirect);
  const controls = useAnimation();

  useEffect(() => {
    if (!misdirected || reducedMotion) return;
    controls
      .start({ x: [0, -6, 4, -3, 0], transition: { duration: 0.5 } })
      .then(() => clearMisdirect());
  }, [misdirected, reducedMotion, controls, clearMisdirect]);

  useEffect(() => {
    if (misdirected && reducedMotion) {
      const timer = window.setTimeout(() => clearMisdirect(), 300);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [misdirected, reducedMotion, clearMisdirect]);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#0b0b0f] via-[#15141b] to-black"
      animate={controls}
    >
      <div className="noise vignette absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(90,29,43,0.25),transparent_65%)]" />
      <div className="absolute inset-0 fog-heavy" />
      <div className="absolute left-8 top-8 z-10">
        <div className="text-xs uppercase tracking-[0.35em] text-brass">False Lead</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-fog">Cathedral Street</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-xs uppercase tracking-[0.4em] text-brass">Empty. The bell tolls for no one.</div>
      </div>
    </motion.div>
  );
};

export default StreetBaitScene;
