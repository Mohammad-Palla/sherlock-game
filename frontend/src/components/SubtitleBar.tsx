import { AnimatePresence, motion } from 'framer-motion';
import { useDirectorStore } from '../state/directorStore';
import TypewriterText from './TypewriterText';

const SubtitleBar = () => {
  const captions = useDirectorStore((s) => s.captions);
  const agents = useDirectorStore((s) => s.agents);
  const subtitlesEnabled = useDirectorStore((s) => s.subtitlesEnabled);
  const reducedMotion = useDirectorStore((s) => s.reducedMotion);

  if (!subtitlesEnabled) return null;

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 w-full max-w-3xl -translate-x-1/2 px-6">
      <div className="rounded-lg border border-brass/20 bg-black/70 px-4 py-3 text-sm text-parchment backdrop-blur subtitle-shadow">
        <AnimatePresence mode="popLayout">
          {captions.slice(-2).map((caption, index, array) => {
            const agent = agents[caption.agentId];
            return (
              <motion.div
                key={caption.id}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
                className="mb-1 last:mb-0"
              >
                <span className="mr-2 text-xs uppercase tracking-[0.2em] text-brass">
                  {agent?.name ?? 'Unknown'}
                </span>
                <span className={`text-parchment ${caption.agentId === 'moriarty' ? 'moriarty-glitch' : ''}`}>
                  {index === array.length - 1 && !reducedMotion ? (
                    <TypewriterText text={caption.text} />
                  ) : (
                    caption.text
                  )}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SubtitleBar;
