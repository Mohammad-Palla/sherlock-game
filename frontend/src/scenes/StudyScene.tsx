import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useDirectorStore } from '../state/directorStore';

const StudyScene = () => {
  const evidence = useDirectorStore((s) => s.evidence);
  const links = useDirectorStore((s) => s.links);
  const reducedMotion = useDirectorStore((s) => s.reducedMotion);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    evidence.forEach((item) => {
      map.set(item.id, { x: item.x, y: item.y });
    });
    return map;
  }, [evidence]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#111014] via-[#1a1a22] to-black">
      <div className="noise vignette absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(192,165,107,0.18),transparent_60%)]" />
      <div className="absolute left-[8%] top-[20%] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)] blur-2xl" />

      <svg className="absolute inset-0 h-full w-full">
        {links.map((link, index) => {
          const from = positions.get(link.fromId);
          const to = positions.get(link.toId);
          if (!from || !to) return null;
          return (
            <motion.line
              key={`${link.fromId}-${link.toId}-${index}`}
              x1={`${from.x}%`}
              y1={`${from.y}%`}
              x2={`${to.x}%`}
              y2={`${to.y}%`}
              stroke="rgba(160,40,50,0.8)"
              strokeWidth="2"
              initial={reducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          );
        })}
      </svg>

      {evidence.map((item) => (
        <motion.div
          key={item.id}
          className="absolute w-56 rounded-sm border border-parchment/20 bg-[#1f1c18]/70 p-4 text-parchment shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
          initial={reducedMotion ? false : { opacity: 0, y: 20, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.6, type: 'spring' }}
          whileHover={reducedMotion ? {} : { rotate: 1, scale: 1.02 }}
        >
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-brass">Evidence</div>
          <div className="font-serif text-lg">{item.title}</div>
          <p className="mt-2 text-xs text-fog">{item.description}</p>
          <div className="mt-3 h-2 w-2 rounded-full bg-burgundy shadow-glow" />
        </motion.div>
      ))}

      {evidence.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm uppercase tracking-[0.35em] text-fog">
          Evidence board awaiting clues
        </div>
      ) : null}
    </div>
  );
};

export default StudyScene;
