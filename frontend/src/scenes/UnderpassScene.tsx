import { motion } from 'framer-motion';
import { useDirectorStore } from '../state/directorStore';

const UnderpassScene = () => {
  const reducedMotion = useDirectorStore((s) => s.reducedMotion);
  const locationLabel = useDirectorStore((s) => s.locationLabel);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#050506] via-[#101014] to-black">
      <div className="noise vignette absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(90,29,43,0.3),transparent_60%)]" />
      <motion.div
        className="absolute inset-0 flashlight-cone"
        animate={reducedMotion ? {} : { backgroundPosition: ['45% 40%', '55% 50%', '48% 45%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ backgroundSize: '200% 200%' }}
      />
      <motion.div
        className="absolute left-[20%] bottom-[10%] h-48 w-80 rounded-[60px] border border-brass/20 bg-black/70"
        animate={reducedMotion ? {} : { y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute left-8 top-8 z-10">
        <div className="text-xs uppercase tracking-[0.35em] text-brass">Underpass Search</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-fog">
          {locationLabel ?? 'Riverside Service Underpass'}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-xs uppercase tracking-[0.4em] text-parchment">Flashlight sweep. Footsteps. A door yields.</div>
      </div>
    </div>
  );
};

export default UnderpassScene;
