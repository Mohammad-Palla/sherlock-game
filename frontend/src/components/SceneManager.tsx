import { AnimatePresence, motion } from 'framer-motion';
import { SceneId } from '../types';
import CrimeScene from '../scenes/CrimeScene';
import StudyScene from '../scenes/StudyScene';
import LairScene from '../scenes/LairScene';
import BootScene from '../scenes/BootScene';
import { useDirectorStore } from '../state/directorStore';

const sceneVariants = {
  initial: { opacity: 0, scale: 1.02, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -20 },
};

const SceneManager = () => {
  const currentScene = useDirectorStore((s) => s.currentScene);
  const reducedMotion = useDirectorStore((s) => s.reducedMotion);

  const renderScene = (scene: SceneId) => {
    switch (scene) {
      case 'CRIME_SCENE':
        return <CrimeScene />;
      case 'STUDY':
        return <StudyScene />;
      case 'LAIR':
        return <LairScene />;
      default:
        return <BootScene />;
    }
  };

  return (
    <div className="relative h-full w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene}
          variants={sceneVariants}
          initial={reducedMotion ? false : 'initial'}
          animate={reducedMotion ? { opacity: 1 } : 'animate'}
          exit={reducedMotion ? { opacity: 0 } : 'exit'}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {renderScene(currentScene)}
        </motion.div>
      </AnimatePresence>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        animate={reducedMotion ? {} : { opacity: [0.4, 0.6, 0.45], x: [-10, 20, -10] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="fog-layer h-full w-full" />
      </motion.div>
    </div>
  );
};

export default SceneManager;
