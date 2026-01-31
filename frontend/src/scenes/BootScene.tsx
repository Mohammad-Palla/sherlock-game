import { motion } from 'framer-motion';
import { useDirectorStore } from '../state/directorStore';
import { useMemo } from 'react';

const BootScene = () => {
  const connectionStatus = useDirectorStore((s) => s.connectionStatus);
  const roomName = useDirectorStore((s) => s.roomName);
  const reducedMotion = useDirectorStore((s) => s.reducedMotion);

  const headline = useMemo(() => {
    if (connectionStatus === 'connecting') return 'Opening the case file...';
    if (connectionStatus === 'connected') return 'The case is live.';
    return 'Enter the case';
  }, [connectionStatus]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-ink via-charcoal to-black">
      <div className="noise vignette absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(192,165,107,0.25),transparent_55%)]" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
        <motion.h1
          className="font-serif text-4xl uppercase tracking-[0.5em] text-parchment md:text-6xl"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        >
          Sherlock vs Moriarty
        </motion.h1>
        <motion.p
          className="max-w-2xl text-sm uppercase tracking-[0.35em] text-fog"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.3 }}
        >
          A live noir investigation where every whisper is a clue.
        </motion.p>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.6 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="text-sm uppercase tracking-[0.35em] text-brass">{headline}</div>
          {roomName ? (
            <div className="text-xs uppercase tracking-[0.3em] text-fog">Room: {roomName}</div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
};

export default BootScene;
