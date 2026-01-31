import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useToastStore } from '../state/toastStore';

const Toasts = () => {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => remove(toast.id), 3000)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, remove]);

  return (
    <div className="pointer-events-none absolute right-6 top-20 flex w-72 flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg border border-brass/20 bg-black/70 px-4 py-3 text-xs uppercase tracking-[0.2em] text-brass"
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toasts;
