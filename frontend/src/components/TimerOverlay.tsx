import { motion } from 'framer-motion';
import { useDirectorStore } from '../state/directorStore';

const formatSeconds = (total: number) => {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const TimerOverlay = () => {
  const timer = useDirectorStore((s) => s.timer);
  const outcome = useDirectorStore((s) => s.caseOutcome);
  const locationLabel = useDirectorStore((s) => s.locationLabel);

  if (!timer) return null;

  const urgent = timer.remainingSeconds <= Math.min(60, Math.floor(timer.totalSeconds * 0.25));

  return (
    <div className="pointer-events-none absolute top-24 left-1/2 z-20 -translate-x-1/2">
      <motion.div
        className={`rounded-full border px-6 py-2 text-xs uppercase tracking-[0.35em] ${
          urgent ? 'border-burgundy text-burgundy shadow-[0_0_24px_rgba(134,31,48,0.5)]' : 'border-brass/50 text-brass'
        } bg-black/70 backdrop-blur`}
        animate={urgent ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={urgent ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      >
        Time Remaining {formatSeconds(timer.remainingSeconds)}
      </motion.div>
      {locationLabel ? (
        <div className="mt-2 text-center text-[10px] uppercase tracking-[0.3em] text-fog">
          {locationLabel}
        </div>
      ) : null}
      {outcome ? (
        <div className="mt-2 text-center text-xs uppercase tracking-[0.3em] text-parchment">
          {outcome === 'SUCCESS' ? 'Rescue confirmed' : 'Timer expired'}
        </div>
      ) : null}
    </div>
  );
};

export default TimerOverlay;
