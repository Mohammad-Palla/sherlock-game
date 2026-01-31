import { useEffect, useState } from 'react';

type TypewriterTextProps = {
  text: string;
  speed?: number;
};

const TypewriterText = ({ text, speed = 18 }: TypewriterTextProps) => {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame += 1;
      const nextLength = Math.min(text.length, Math.floor(frame / (60 / speed)) + 1);
      setDisplayed(text.slice(0, nextLength));
      if (nextLength < text.length) {
        requestAnimationFrame(tick);
      }
    };
    setDisplayed('');
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      <span className="ml-1 inline-block h-4 w-[1px] animate-pulse bg-parchment" />
    </span>
  );
};

export default TypewriterText;
