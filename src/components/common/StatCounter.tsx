import React, { useEffect, useRef, useState } from 'react';
import { useInView, animate } from 'framer-motion';

interface StatCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  duration?: number;
}

export const StatCounter: React.FC<StatCounterProps> = ({
  value,
  suffix = '',
  prefix = '',
  label,
  duration = 1.8
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => {
          setDisplayCount(Math.floor(latest));
        }
      });
      return () => controls.stop();
    }
  }, [isInView, value, duration]);

  return (
    <div ref={ref} className="stat-item">
      <div className="stat-value">
        {prefix}
        {displayCount}
        {suffix}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
};
